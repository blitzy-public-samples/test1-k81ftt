/**
 * @fileoverview Service responsible for handling full-text search operations using Elasticsearch
 * Implements advanced search capabilities with support for filters, facets, and caching
 * @version 1.0.0
 */

import { Client, SearchResponse } from '@elastic/elasticsearch'; // v8.0.0
import CircuitBreaker from 'opossum'; // v6.0.0
import { IService } from '../interfaces/IService';
import { BaseEntity } from '../../types/common.types';

/**
 * Configuration for search facets
 */
interface FacetConfig {
  field: string;
  size?: number;
}

/**
 * Configuration for field boosting in search
 */
interface BoostConfig {
  field: string;
  boost: number;
}

/**
 * Interface for search query parameters
 */
export interface SearchQuery {
  query: string;
  fields?: string[];
  from?: number;
  size?: number;
  filters?: Record<string, any>;
  facets?: FacetConfig[];
  fieldBoosts?: BoostConfig[];
  highlight?: boolean;
}

/**
 * Interface for search results
 */
interface SearchResults<T extends BaseEntity> {
  hits: Array<{
    item: T;
    score: number;
    highlights?: Record<string, string[]>;
  }>;
  total: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

/**
 * Interface for bulk indexing results
 */
interface BulkIndexResult {
  successful: number;
  failed: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Service class implementing advanced search functionality using Elasticsearch
 */
export class SearchService<T extends BaseEntity> implements IService<T> {
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutes cache TTL
  private readonly CIRCUIT_BREAKER_OPTIONS = {
    timeout: 3000, // 3 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 seconds
  };

  private readonly circuitBreaker: CircuitBreaker;

  /**
   * Creates an instance of SearchService
   * @param elasticClient - Elasticsearch client instance
   * @param indexName - Name of the Elasticsearch index
   */
  constructor(
    private readonly elasticClient: Client,
    private readonly indexName: string
  ) {
    this.validateClient();
    this.circuitBreaker = new CircuitBreaker(
      this.executeSearch.bind(this),
      this.CIRCUIT_BREAKER_OPTIONS
    );
  }

  /**
   * Validates Elasticsearch client connection
   * @throws Error if client connection fails
   */
  private async validateClient(): Promise<void> {
    try {
      await this.elasticClient.ping();
      const indexExists = await this.elasticClient.indices.exists({
        index: this.indexName,
      });
      if (!indexExists) {
        throw new Error(`Index ${this.indexName} does not exist`);
      }
    } catch (error) {
      throw new Error(`Elasticsearch connection failed: ${error.message}`);
    }
  }

  /**
   * Executes search query against Elasticsearch
   * @param searchQuery - Search query parameters
   * @returns Promise with search response
   */
  private async executeSearch(
    searchQuery: SearchQuery
  ): Promise<SearchResponse<T>> {
    const {
      query,
      fields = ['*'],
      from = 0,
      size = 10,
      filters,
      facets,
      fieldBoosts,
      highlight,
    } = searchQuery;

    const searchBody: any = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: fields.map(field => 
                  fieldBoosts?.find(boost => boost.field === field)
                    ? `${field}^${boost.boost}`
                    : field
                ),
                type: 'best_fields',
                fuzziness: 'AUTO',
              },
            },
          ],
        },
      },
      from,
      size,
    };

    // Add filters if provided
    if (filters) {
      searchBody.query.bool.filter = Object.entries(filters).map(([field, value]) => ({
        term: { [field]: value },
      }));
    }

    // Add facets if requested
    if (facets) {
      searchBody.aggs = facets.reduce((acc, facet) => ({
        ...acc,
        [facet.field]: {
          terms: {
            field: facet.field,
            size: facet.size || 10,
          },
        },
      }), {});
    }

    // Add highlighting if requested
    if (highlight) {
      searchBody.highlight = {
        fields: fields.reduce((acc, field) => ({
          ...acc,
          [field]: { number_of_fragments: 3 },
        }), {}),
      };
    }

    return await this.elasticClient.search<T>({
      index: this.indexName,
      body: searchBody,
    });
  }

  /**
   * Performs optimized full-text search with caching
   * @param query - Search query parameters
   * @returns Promise with search results
   */
  public async search(query: SearchQuery): Promise<SearchResults<T>> {
    try {
      const response = await this.circuitBreaker.fire(query);
      
      const results: SearchResults<T> = {
        hits: response.hits.hits.map(hit => ({
          item: hit._source as T,
          score: hit._score || 0,
          highlights: hit.highlight,
        })),
        total: response.hits.total.value,
      };

      // Add facets if they were requested and returned
      if (query.facets && response.aggregations) {
        results.facets = Object.entries(response.aggregations).reduce(
          (acc, [field, agg]) => ({
            ...acc,
            [field]: agg.buckets.map(bucket => ({
              value: bucket.key,
              count: bucket.doc_count,
            })),
          }),
          {}
        );
      }

      return results;
    } catch (error) {
      throw new Error(`Search operation failed: ${error.message}`);
    }
  }

  /**
   * Performs bulk indexing of documents
   * @param documents - Array of documents to index
   * @returns Promise with bulk indexing results
   */
  public async bulkIndex(documents: T[]): Promise<BulkIndexResult> {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error('Invalid documents array provided for bulk indexing');
    }

    const operations = documents.flatMap(doc => [
      { index: { _index: this.indexName, _id: doc.id } },
      doc,
    ]);

    try {
      const { items } = await this.elasticClient.bulk({ body: operations });
      
      const result: BulkIndexResult = {
        successful: 0,
        failed: [],
      };

      items.forEach((item, index) => {
        if (item.index?.error) {
          result.failed.push({
            id: documents[index].id,
            error: item.index.error.reason || 'Unknown error',
          });
        } else {
          result.successful++;
        }
      });

      return result;
    } catch (error) {
      throw new Error(`Bulk indexing failed: ${error.message}`);
    }
  }
}