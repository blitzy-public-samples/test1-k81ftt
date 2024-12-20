/**
 * @fileoverview Integration tests for project management functionality
 * Tests the complete flow from HTTP endpoints through service layer to database operations
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { faker } from '@faker-js/faker';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from '../../src/api/controllers/project.controller';
import { ProjectService } from '../../core/services/ProjectService';
import { ProjectValidator } from '../../api/validators/project.validator';
import { ProjectStatus } from '../../interfaces/IProject';
import { UUID } from '../../types/common.types';

describe('Project Integration Tests', () => {
  let app: INestApplication;
  let testModule: TestingModule;
  let authToken: string;

  // Test data constants
  const TEST_USER_ID = faker.string.uuid() as UUID;
  const ADMIN_USER_ID = faker.string.uuid() as UUID;

  /**
   * Utility function to measure and verify API response times
   */
  const measureResponseTime = async (apiCall: Promise<any>): Promise<number> => {
    const start = Date.now();
    await apiCall;
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500); // API response time < 500ms requirement
    return duration;
  };

  beforeAll(async () => {
    // Create test module with all required dependencies
    testModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT || '5432'),
          username: process.env.TEST_DB_USER || 'test',
          password: process.env.TEST_DB_PASSWORD || 'test',
          database: process.env.TEST_DB_NAME || 'test',
          entities: [Project],
          synchronize: true,
        }),
      ],
      controllers: [ProjectController],
      providers: [ProjectService, ProjectValidator],
    }).compile();

    app = testModule.createNestApplication();
    await app.init();

    // Setup test auth token
    authToken = 'test-auth-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Project CRUD Operations', () => {
    let projectId: UUID;

    it('should create a new project with validation', async () => {
      const projectData = {
        name: faker.company.name(),
        description: faker.lorem.paragraph(),
        ownerId: TEST_USER_ID,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000), // Tomorrow
        metadata: {
          department: faker.commerce.department(),
          priority: 'HIGH'
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: projectData.name,
        description: projectData.description,
        ownerId: projectData.ownerId,
        status: ProjectStatus.PLANNING
      });

      projectId = response.body.id;
    });

    it('should retrieve project list with pagination and filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 10,
          status: ProjectStatus.PLANNING
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number)
      });
    });

    it('should update project with optimistic locking', async () => {
      const updateData = {
        name: faker.company.name(),
        status: ProjectStatus.IN_PROGRESS,
        version: 1
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: projectId,
        name: updateData.name,
        status: updateData.status,
        version: 2
      });
    });

    it('should handle version conflicts during updates', async () => {
      const updateData = {
        name: faker.company.name(),
        version: 1 // Outdated version
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(409); // Conflict
    });

    it('should delete project with cascade operations', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // Verify project is soft deleted
      const getResponse = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Project Security', () => {
    it('should enforce role-based access control', async () => {
      // Test with regular user
      const regularUserResponse = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: faker.company.name(),
          ownerId: TEST_USER_ID
        });

      expect(regularUserResponse.status).toBe(403); // Forbidden

      // Test with admin user
      const adminResponse = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer admin-${authToken}`)
        .send({
          name: faker.company.name(),
          ownerId: ADMIN_USER_ID
        });

      expect(adminResponse.status).toBe(201);
    });

    it('should validate input data and prevent injection', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        description: 'DROP TABLE projects;',
        ownerId: TEST_USER_ID
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Validation failed');
    });
  });

  describe('Performance Requirements', () => {
    it('should meet response time requirements for list operations', async () => {
      const duration = await measureResponseTime(
        request(app.getHttpServer())
          .get('/api/v1/projects')
          .set('Authorization', `Bearer ${authToken}`)
      );

      expect(duration).toBeLessThan(500);
    });

    it('should handle concurrent project operations', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() => 
        request(app.getHttpServer())
          .post('/api/v1/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: faker.company.name(),
            ownerId: TEST_USER_ID,
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000)
          })
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });
  });
});