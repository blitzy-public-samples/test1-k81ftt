/**
 * Authentication Integration Tests
 * Version: 1.0.0
 * 
 * Comprehensive integration tests for authentication endpoints and flows including
 * OAuth2/OIDC, JWT, password-based authentication, MFA verification, and RBAC authorization.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'; // ^29.0.0
import request from 'supertest'; // ^6.3.3
import { GenericContainer, StartedTestContainer } from 'testcontainers'; // ^9.0.0
import { AuthService } from '../../src/core/services/AuthService';
import { UserRole, AuthProvider } from '../../src/types/auth.types';
import { User } from '../../src/models/User';

// Test configuration
const TEST_CONFIG = {
  database: {
    name: 'test_auth_db',
    port: 5432,
    image: 'postgres:14-alpine'
  },
  redis: {
    port: 6379,
    image: 'redis:7-alpine'
  },
  oauth: {
    azureAdB2cTenant: 'test-tenant',
    clientId: 'test-client',
    scope: 'test-scope'
  },
  mfa: {
    issuer: 'test-issuer',
    period: 30
  }
};

// Test data
const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!@#',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN
  },
  member: {
    email: 'member@test.com',
    password: 'Member123!@#',
    firstName: 'Member',
    lastName: 'User',
    role: UserRole.MEMBER
  }
};

describe('Auth Integration Tests', () => {
  let dbContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let authService: AuthService;
  let app: any;

  // Setup test environment
  beforeAll(async () => {
    // Start test containers
    dbContainer = await new GenericContainer(TEST_CONFIG.database.image)
      .withExposedPorts(TEST_CONFIG.database.port)
      .withEnvironment({
        POSTGRES_DB: TEST_CONFIG.database.name,
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test'
      })
      .start();

    redisContainer = await new GenericContainer(TEST_CONFIG.redis.image)
      .withExposedPorts(TEST_CONFIG.redis.port)
      .start();

    // Initialize test application and services
    const dbPort = dbContainer.getMappedPort(TEST_CONFIG.database.port);
    const redisPort = redisContainer.getMappedPort(TEST_CONFIG.redis.port);

    // Initialize auth service with test configuration
    // Note: Actual initialization would be done through DI container
    authService = new AuthService(
      {}, // userRepository mock
      {}, // redisClient mock
      {}, // logger mock
      {}, // rateLimiter mock
      {}, // auditLogger mock
      {}  // tokenRotator mock
    );
  });

  afterAll(async () => {
    await dbContainer.stop();
    await redisContainer.stop();
  });

  beforeEach(async () => {
    // Reset database state
    // Clear Redis cache
  });

  describe('Local Authentication', () => {
    test('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.member.email,
          password: TEST_USERS.member.password,
          provider: AuthProvider.LOCAL
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.tokenType).toBe('Bearer');
    });

    test('should fail login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.member.email,
          password: 'wrongpassword',
          provider: AuthProvider.LOCAL
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should enforce rate limiting on failed attempts', async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: TEST_USERS.member.email,
            password: 'wrongpassword',
            provider: AuthProvider.LOCAL
          });
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.member.email,
          password: TEST_USERS.member.password,
          provider: AuthProvider.LOCAL
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toMatch(/rate limit exceeded/i);
    });
  });

  describe('OAuth2/OIDC Authentication', () => {
    test('should initiate Azure AD B2C authentication flow', async () => {
      const response = await request(app)
        .get('/api/v1/auth/azure')
        .query({
          redirect_uri: 'http://localhost:3000/callback'
        });

      expect(response.status).toBe(302);
      expect(response.header.location).toMatch(/login\.microsoftonline\.com/);
    });

    test('should handle OAuth2 callback successfully', async () => {
      const response = await request(app)
        .get('/api/v1/auth/azure/callback')
        .query({
          code: 'test_auth_code',
          state: 'test_state'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
    });
  });

  describe('MFA Verification', () => {
    let mfaUser: User;
    let mfaSecret: string;

    beforeEach(async () => {
      // Setup user with MFA enabled
      mfaUser = new User(
        TEST_USERS.member.email,
        TEST_USERS.member.firstName,
        TEST_USERS.member.lastName,
        TEST_USERS.member.role
      );
      mfaUser.mfaEnabled = true;
      
      const mfaSetup = await authService.generateMfaToken(mfaUser.id);
      mfaSecret = mfaSetup.code;
    });

    test('should require MFA token for enabled users', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: mfaUser.email,
          password: TEST_USERS.member.password,
          provider: AuthProvider.LOCAL
        });

      expect(loginResponse.status).toBe(403);
      expect(loginResponse.body.error).toMatch(/mfa required/i);
    });

    test('should validate correct MFA token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/mfa/verify')
        .send({
          userId: mfaUser.id,
          token: '123456' // Mock valid token
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
    });
  });

  describe('Token Management', () => {
    let validTokens: { accessToken: string; refreshToken: string };

    beforeEach(async () => {
      // Get valid tokens for testing
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.member.email,
          password: TEST_USERS.member.password,
          provider: AuthProvider.LOCAL
        });

      validTokens = {
        accessToken: loginResponse.body.accessToken,
        refreshToken: loginResponse.body.refreshToken
      };
    });

    test('should refresh tokens successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/token/refresh')
        .send({
          refreshToken: validTokens.refreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).not.toBe(validTokens.accessToken);
    });

    test('should revoke tokens on logout', async () => {
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${validTokens.accessToken}`);

      expect(logoutResponse.status).toBe(200);

      // Attempt to use revoked token
      const protectedResponse = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', `Bearer ${validTokens.accessToken}`);

      expect(protectedResponse.status).toBe(401);
    });
  });

  describe('RBAC Authorization', () => {
    test('should enforce role-based access control', async () => {
      // Login as member
      const memberLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.member.email,
          password: TEST_USERS.member.password,
          provider: AuthProvider.LOCAL
        });

      // Attempt to access admin endpoint
      const memberResponse = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${memberLogin.body.accessToken}`);

      expect(memberResponse.status).toBe(403);

      // Login as admin
      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.admin.email,
          password: TEST_USERS.admin.password,
          provider: AuthProvider.LOCAL
        });

      // Access admin endpoint
      const adminResponse = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`);

      expect(adminResponse.status).toBe(200);
    });
  });
});