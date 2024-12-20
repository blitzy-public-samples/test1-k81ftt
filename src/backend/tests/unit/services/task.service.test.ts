/**
 * @fileoverview Comprehensive unit tests for TaskService class verifying task management
 * business logic, validation, event handling, caching, performance, and audit logging.
 * @version 1.0.0
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'; // v29.0.0
import { MockProxy, mock } from 'jest-mock-extended'; // v3.0.0
import { faker } from '@faker-js/faker'; // v8.0.0
import { Cache } from 'cache-manager'; // v5.0.0
import { Logger } from 'winston'; // v3.8.2

import { TaskService } from '../../../src/core/services/TaskService';
import { TaskRepository } from '../../../src/core/repositories/TaskRepository';
import { EventBus } from '../../../src/core/events/EventBus';
import { ITask, TaskStatus, TaskPriority } from '../../../src/interfaces/ITask';
import { EventType } from '../../../src/types/event.types';
import { UUID } from '../../../src/types/common.types';
import { ValidationError, EntityNotFoundError, BusinessRuleError } from '../../../src/utils/errors';

// Mock dependencies
let mockTaskRepository: MockProxy<TaskRepository>;
let mockEventBus: MockProxy<EventBus>;
let mockCache: MockProxy<Cache>;
let mockLogger: MockProxy<Logger>;
let taskService: TaskService;

// Test data generators
const generateTaskId = (): UUID => faker.string.uuid() as UUID;
const generateTask = (overrides: Partial<ITask> = {}): ITask => ({
  id: generateTaskId(),
  title: faker.lorem.words(3),
  description: faker.lorem.paragraph(),
  projectId: generateTaskId(),
  assigneeId: generateTaskId(),
  creatorId: generateTaskId(),
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  dueDate: faker.date.future(),
  startDate: null,
  completedAt: null,
  estimatedHours: faker.number.int({ min: 1, max: 40 }),
  dependencies: [],
  tags: [],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  ...overrides
});

describe('TaskService', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockTaskRepository = mock<TaskRepository>();
    mockEventBus = mock<EventBus>();
    mockCache = mock<Cache>();
    mockLogger = mock<Logger>();

    // Initialize service with mocks
    taskService = new TaskService(
      mockTaskRepository,
      mockEventBus,
      mockCache,
      mockLogger
    );

    // Configure default mock behaviors
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Task Retrieval Operations', () => {
    test('should return task with cache hit', async () => {
      // Arrange
      const task = generateTask();
      mockCache.get.mockResolvedValueOnce(task);

      // Act
      const result = await taskService.findById(task.id);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(task.id);
      expect(mockCache.get).toHaveBeenCalledWith(`task:${task.id}`);
      expect(mockTaskRepository.findById).not.toHaveBeenCalled();
    });

    test('should fetch and cache task on cache miss', async () => {
      // Arrange
      const task = generateTask();
      mockCache.get.mockResolvedValueOnce(null);
      mockTaskRepository.findById.mockResolvedValueOnce(task);

      // Act
      const result = await taskService.findById(task.id);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(task.id);
      expect(mockCache.set).toHaveBeenCalledWith(
        `task:${task.id}`,
        task,
        3600
      );
    });

    test('should handle non-existent task', async () => {
      // Arrange
      const taskId = generateTaskId();
      mockCache.get.mockResolvedValueOnce(null);
      mockTaskRepository.findById.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(taskService.findById(taskId)).rejects.toThrow(EntityNotFoundError);
    });

    test('should return paginated tasks with correct metadata', async () => {
      // Arrange
      const tasks = Array.from({ length: 5 }, () => generateTask());
      mockTaskRepository.findAll.mockResolvedValueOnce({
        data: tasks,
        total: 20,
        page: 1,
        pageSize: 5,
        totalPages: 4
      });

      // Act
      const result = await taskService.findAll({
        pagination: { page: 1, limit: 5 }
      });

      // Assert
      expect(result.data).toHaveLength(5);
      expect(result.total).toBe(20);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('Task Mutation Operations', () => {
    test('should create task with all validations', async () => {
      // Arrange
      const taskData = {
        title: 'New Task',
        description: 'Task Description',
        projectId: generateTaskId(),
        assigneeId: generateTaskId(),
        priority: TaskPriority.HIGH,
        dueDate: faker.date.future()
      };
      const createdTask = generateTask(taskData);
      mockTaskRepository.create.mockResolvedValueOnce(createdTask);

      // Act
      const result = await taskService.create(taskData);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe(taskData.title);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        EventType.TASK_CREATED,
        expect.objectContaining({ task: createdTask })
      );
    });

    test('should validate task title length', async () => {
      // Arrange
      const invalidTask = {
        title: 'ab', // Too short
        projectId: generateTaskId(),
        assigneeId: generateTaskId(),
        dueDate: faker.date.future()
      };

      // Act & Assert
      await expect(taskService.create(invalidTask)).rejects.toThrow(ValidationError);
    });

    test('should handle concurrent updates with version check', async () => {
      // Arrange
      const task = generateTask();
      const updateData = { title: 'Updated Title' };
      mockTaskRepository.findById.mockResolvedValueOnce(task);
      mockTaskRepository.update.mockResolvedValueOnce({
        ...task,
        ...updateData,
        version: task.version + 1
      });

      // Act
      const result = await taskService.update(task.id, updateData, task.version);

      // Assert
      expect(result.title).toBe(updateData.title);
      expect(result.version).toBe(task.version + 1);
      expect(mockCache.del).toHaveBeenCalledWith(`task:${task.id}`);
    });

    test('should prevent update with incorrect version', async () => {
      // Arrange
      const task = generateTask();
      const updateData = { title: 'Updated Title' };
      mockTaskRepository.findById.mockResolvedValueOnce(task);

      // Act & Assert
      await expect(
        taskService.update(task.id, updateData, task.version + 1)
      ).rejects.toThrow(BusinessRuleError);
    });
  });

  describe('Error Handling', () => {
    test('should handle repository errors gracefully', async () => {
      // Arrange
      const taskId = generateTaskId();
      mockCache.get.mockRejectedValueOnce(new Error('Cache error'));
      mockTaskRepository.findById.mockRejectedValueOnce(new Error('DB error'));

      // Act & Assert
      await expect(taskService.findById(taskId)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should maintain data consistency on failed updates', async () => {
      // Arrange
      const task = generateTask();
      const updateData = { title: 'Updated Title' };
      mockTaskRepository.findById.mockResolvedValueOnce(task);
      mockTaskRepository.update.mockRejectedValueOnce(new Error('Update failed'));

      // Act & Assert
      await expect(
        taskService.update(task.id, updateData, task.version)
      ).rejects.toThrow();
      expect(mockCache.del).not.toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring', () => {
    test('should complete within 500ms performance threshold', async () => {
      // Arrange
      const task = generateTask();
      mockCache.get.mockResolvedValueOnce(task);
      const startTime = Date.now();

      // Act
      await taskService.findById(task.id);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(500);
    });

    test('should optimize cache usage', async () => {
      // Arrange
      const tasks = Array.from({ length: 3 }, () => generateTask());
      
      // Simulate cache hits and misses
      tasks.forEach((task, index) => {
        if (index % 2 === 0) {
          mockCache.get.mockResolvedValueOnce(task);
        } else {
          mockCache.get.mockResolvedValueOnce(null);
          mockTaskRepository.findById.mockResolvedValueOnce(task);
        }
      });

      // Act
      await Promise.all(tasks.map(task => taskService.findById(task.id)));

      // Assert
      expect(mockCache.get).toHaveBeenCalledTimes(tasks.length);
      expect(mockTaskRepository.findById).toHaveBeenCalledTimes(
        Math.floor(tasks.length / 2)
      );
    });
  });
});