/**
 * @fileoverview Comprehensive unit test suite for ProjectService class
 * Testing CRUD operations, business logic validation, event publishing,
 * and error handling scenarios.
 * @version 1.0.0
 */

import { describe, beforeEach, it, expect, jest } from '@jest/globals'; // v29.0.0
import { ProjectService } from '../../../src/core/services/ProjectService';
import { ProjectRepository } from '../../../src/core/repositories/ProjectRepository';
import { EventBus } from '../../../src/core/events/EventBus';
import { CreateProjectDto, UpdateProjectDto } from '../../../src/dto/project.dto';
import { ProjectStatus } from '../../../src/interfaces/IProject';
import { EventType } from '../../../src/types/event.types';
import { UUID } from '../../../src/types/common.types';

// Mock implementations
jest.mock('../../../src/core/repositories/ProjectRepository');
jest.mock('../../../src/core/events/EventBus');
jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  Cache: jest.fn(),
}));

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockProjectRepository: jest.Mocked<ProjectRepository>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockCache: jest.Mocked<any>;

  // Test data
  const testUUID = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const testDate = new Date();

  const mockProject = {
    id: testUUID,
    name: 'Test Project',
    description: 'Test Description',
    ownerId: testUUID,
    status: ProjectStatus.PLANNING,
    startDate: testDate,
    endDate: new Date(testDate.getTime() + 86400000),
    metadata: {},
    createdAt: testDate,
    updatedAt: testDate,
    version: 1
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocks
    mockProjectRepository = new ProjectRepository(null, null) as jest.Mocked<ProjectRepository>;
    mockEventBus = EventBus.getInstance() as jest.Mocked<EventBus>;
    mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

    // Initialize service with mocks
    projectService = new ProjectService(mockProjectRepository, mockCache);
  });

  describe('findById', () => {
    it('should successfully retrieve a project by ID', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);

      const result = await projectService.findById(testUUID);

      expect(result).toEqual(mockProject);
      expect(mockProjectRepository.findById).toHaveBeenCalledWith(testUUID);
    });

    it('should throw error when project is not found', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      await expect(projectService.findById(testUUID))
        .rejects
        .toThrow('Project not found');
    });

    it('should handle repository errors gracefully', async () => {
      mockProjectRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(projectService.findById(testUUID))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('findAll', () => {
    const mockPaginatedResponse = {
      data: [mockProject],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1
    };

    it('should retrieve all projects with pagination', async () => {
      mockProjectRepository.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await projectService.findAll({
        pagination: { page: 1, limit: 10 }
      });

      expect(result.data).toEqual([mockProject]);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should handle empty result set', async () => {
      mockProjectRepository.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        data: [],
        total: 0
      });

      const result = await projectService.findAll();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should apply filters correctly', async () => {
      const filters = [{
        field: 'status',
        operator: 'eq',
        value: ProjectStatus.PLANNING
      }];

      await projectService.findAll({ filters });

      expect(mockProjectRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ filters })
      );
    });
  });

  describe('create', () => {
    const createDto: CreateProjectDto = {
      name: 'New Project',
      description: 'New Description',
      ownerId: testUUID,
      startDate: testDate,
      endDate: new Date(testDate.getTime() + 86400000),
      metadata: {}
    };

    it('should successfully create a project', async () => {
      mockProjectRepository.create.mockResolvedValue(mockProject);
      mockEventBus.publish.mockResolvedValue();

      const result = await projectService.create(createDto);

      expect(result).toEqual(mockProject);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        EventType.PROJECT_CREATED,
        expect.objectContaining({
          type: EventType.PROJECT_CREATED,
          data: mockProject
        })
      );
    });

    it('should validate project timeline', async () => {
      const invalidDto = {
        ...createDto,
        startDate: new Date(2024, 1, 2),
        endDate: new Date(2024, 1, 1)
      };

      await expect(projectService.create(invalidDto))
        .rejects
        .toThrow('Project start date must be before end date');
    });

    it('should handle parent project validation', async () => {
      const dtoWithParent = {
        ...createDto,
        parentId: testUUID
      };

      mockProjectRepository.findById.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.COMPLETED
      });

      await expect(projectService.create(dtoWithParent))
        .rejects
        .toThrow('Cannot add project to completed or cancelled parent');
    });
  });

  describe('update', () => {
    const updateDto: UpdateProjectDto = {
      name: 'Updated Project',
      description: 'Updated Description',
      status: ProjectStatus.IN_PROGRESS
    };

    it('should successfully update a project', async () => {
      const updatedProject = { ...mockProject, ...updateDto };
      mockProjectRepository.update.mockResolvedValue(updatedProject);
      mockEventBus.publish.mockResolvedValue();

      const result = await projectService.update(testUUID, updateDto, 1);

      expect(result).toEqual(updatedProject);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        EventType.PROJECT_UPDATED,
        expect.objectContaining({
          type: EventType.PROJECT_UPDATED,
          data: updatedProject
        })
      );
    });

    it('should handle version conflicts', async () => {
      mockProjectRepository.update.mockRejectedValue(
        new Error('Version mismatch - update conflict detected')
      );

      await expect(projectService.update(testUUID, updateDto, 1))
        .rejects
        .toThrow('Version mismatch - update conflict detected');
    });

    it('should validate timeline updates', async () => {
      const invalidUpdate = {
        startDate: new Date(2024, 1, 2),
        endDate: new Date(2024, 1, 1)
      };

      await expect(projectService.update(testUUID, invalidUpdate, 1))
        .rejects
        .toThrow('Project start date must be before end date');
    });
  });

  describe('delete', () => {
    it('should successfully delete a project', async () => {
      mockProjectRepository.softDelete.mockResolvedValue(true);
      mockEventBus.publish.mockResolvedValue();

      const result = await projectService.delete(testUUID);

      expect(result).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        EventType.PROJECT_DELETED,
        expect.objectContaining({
          type: EventType.PROJECT_DELETED,
          data: { id: testUUID }
        })
      );
    });

    it('should handle deletion failures', async () => {
      mockProjectRepository.softDelete.mockResolvedValue(false);

      const result = await projectService.delete(testUUID);

      expect(result).toBe(false);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle repository errors during deletion', async () => {
      mockProjectRepository.softDelete.mockRejectedValue(
        new Error('Database error')
      );

      await expect(projectService.delete(testUUID))
        .rejects
        .toThrow('Database error');
    });
  });
});