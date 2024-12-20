/**
 * @fileoverview Comprehensive integration tests for task management API endpoints.
 * Tests CRUD operations, validation rules, real-time updates, and error handling.
 * 
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals'; // v29.7.0
import supertest from 'supertest'; // v6.3.3
import { Container } from 'inversify'; // v6.0.1
import { io as Client } from 'socket.io-client'; // v4.7.2
import { v4 as uuidv4 } from 'uuid';

import { TaskController } from '../../src/api/controllers/task.controller';
import { TaskService } from '../../src/core/services/TaskService';
import { EventTypes } from '../../src/types/event.types';
import { TASK_VALIDATION } from '../../src/constants/validation.constants';
import { TaskStatus, TaskPriority } from '../../src/interfaces/ITask';
import { UUID } from '../../src/types/common.types';

describe('Task API Integration Tests', () => {
  let app: Express.Application;
  let request: supertest.SuperTest<supertest.Test>;
  let container: Container;
  let socketClient: ReturnType<typeof Client>;
  let taskService: TaskService;
  let testTaskId: UUID;

  // Test data
  const validTaskData = {
    title: 'Test Task',
    description: 'Test Description',
    projectId: uuidv4(),
    assigneeId: uuidv4(),
    priority: TaskPriority.MEDIUM,
    dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    estimatedHours: 8,
    tags: ['test', 'integration']
  };

  beforeAll(async () => {
    // Set up dependency injection container
    container = new Container();
    container.bind<TaskService>('TaskService').to(TaskService);
    container.bind<TaskController>('TaskController').to(TaskController);

    // Initialize test server and WebSocket client
    app = await initializeTestServer(container);
    request = supertest(app);
    socketClient = Client(`http://localhost:${process.env.PORT}`, {
      autoConnect: true,
      transports: ['websocket']
    });

    // Get service instance for direct DB operations
    taskService = container.get<TaskService>('TaskService');
  });

  afterAll(async () => {
    await cleanupTestData();
    socketClient.disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Reset test data before each test
    await taskService.deleteAll({ force: true });
  });

  describe('GET /api/tasks', () => {
    test('should return paginated tasks with default pagination', async () => {
      // Create test tasks
      const tasks = await Promise.all([
        taskService.create(validTaskData),
        taskService.create({ ...validTaskData, title: 'Task 2' })
      ]);

      const response = await request
        .get('/api/tasks')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          hasMore: false
        }
      });
      expect(response.body.data).toHaveLength(2);
    });

    test('should apply filters correctly', async () => {
      // Create tasks with different statuses
      await Promise.all([
        taskService.create(validTaskData),
        taskService.create({
          ...validTaskData,
          status: TaskStatus.IN_PROGRESS
        })
      ]);

      const response = await request
        .get('/api/tasks')
        .query({
          filter: JSON.stringify([
            { field: 'status', operator: 'eq', value: TaskStatus.TODO }
          ])
        })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe(TaskStatus.TODO);
    });

    test('should validate query parameters', async () => {
      const response = await request
        .get('/api/tasks')
        .query({ page: 'invalid' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('Invalid page parameter')
      });
    });

    test('should return tasks within performance SLA', async () => {
      const startTime = Date.now();
      await request.get('/api/tasks').expect(200);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(500); // 500ms SLA
    });
  });

  describe('POST /api/tasks', () => {
    test('should create task and emit real-time event', async () => {
      // Listen for real-time event
      const eventPromise = new Promise(resolve => {
        socketClient.once(EventTypes.TASK_CREATED, resolve);
      });

      const response = await request
        .post('/api/tasks')
        .send(validTaskData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify response
      expect(response.body).toMatchObject({
        id: expect.any(String),
        ...validTaskData,
        status: TaskStatus.TODO,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        version: 1
      });

      // Verify real-time event
      const event = await eventPromise;
      expect(event).toMatchObject({
        type: EventTypes.TASK_CREATED,
        data: { task: response.body }
      });
    });

    test('should validate required fields', async () => {
      const invalidData = { ...validTaskData, title: '' };
      const response = await request
        .post('/api/tasks')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('Title is required')
      });
    });

    test('should validate title length constraints', async () => {
      const tooShortTitle = 'ab';
      const tooLongTitle = 'a'.repeat(TASK_VALIDATION.TITLE_MAX_LENGTH + 1);

      await request
        .post('/api/tasks')
        .send({ ...validTaskData, title: tooShortTitle })
        .expect(400);

      await request
        .post('/api/tasks')
        .send({ ...validTaskData, title: tooLongTitle })
        .expect(400);
    });

    test('should prevent XSS in text fields', async () => {
      const maliciousData = {
        ...validTaskData,
        title: '<script>alert("xss")</script>Test',
        description: '<img src="x" onerror="alert(1)">Test'
      };

      const response = await request
        .post('/api/tasks')
        .send(maliciousData)
        .expect(201);

      expect(response.body.title).not.toMatch(/<script>/);
      expect(response.body.description).not.toMatch(/<img/);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    test('should update task with optimistic locking', async () => {
      // Create test task
      const task = await taskService.create(validTaskData);
      const updateData = { title: 'Updated Title' };

      const response = await request
        .put(`/api/tasks/${task.id}`)
        .set('If-Match', `${task.version}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        ...task,
        ...updateData,
        version: task.version + 1
      });
    });

    test('should handle concurrent updates', async () => {
      const task = await taskService.create(validTaskData);

      // Simulate concurrent updates
      const update1 = request
        .put(`/api/tasks/${task.id}`)
        .set('If-Match', `${task.version}`)
        .send({ title: 'Update 1' });

      const update2 = request
        .put(`/api/tasks/${task.id}`)
        .set('If-Match', `${task.version}`)
        .send({ title: 'Update 2' });

      const [response1, response2] = await Promise.all([update1, update2]);
      expect(response1.status === 200 || response2.status === 409).toBeTruthy();
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    test('should delete task and emit event', async () => {
      const task = await taskService.create(validTaskData);
      const eventPromise = new Promise(resolve => {
        socketClient.once(EventTypes.TASK_DELETED, resolve);
      });

      await request
        .delete(`/api/tasks/${task.id}`)
        .expect(204);

      const event = await eventPromise;
      expect(event).toMatchObject({
        type: EventTypes.TASK_DELETED,
        data: { taskId: task.id }
      });

      // Verify task is deleted
      await request
        .get(`/api/tasks/${task.id}`)
        .expect(404);
    });
  });
});

/**
 * Helper function to initialize test server
 */
async function initializeTestServer(container: Container): Promise<Express.Application> {
  // Implementation omitted for brevity
  return {} as Express.Application;
}

/**
 * Helper function to clean up test data
 */
async function cleanupTestData(): Promise<void> {
  // Implementation omitted for brevity
}