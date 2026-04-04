import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log('Seeding database...');

  // Clean existing data (order matters for foreign keys)
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.issueLabel.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.label.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // --- Users ---
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@trackify.dev',
      password: hashedPassword,
      fullName: 'Admin User',
      role: 'ADMIN',
    },
  });

  const alice = await prisma.user.create({
    data: {
      email: 'alice@trackify.dev',
      password: hashedPassword,
      fullName: 'Alice Nguyen',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@trackify.dev',
      password: hashedPassword,
      fullName: 'Bob Tran',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@trackify.dev',
      password: hashedPassword,
      fullName: 'Charlie Le',
    },
  });

  console.log(`Created ${4} users`);

  // --- Project ---
  const project = await prisma.project.create({
    data: {
      name: 'Trackify Agile',
      key: 'TRK',
      description: 'Demo agile project for Trackify',
      issueSequence: 6,
    },
  });

  console.log(`Created project: ${project.name}`);

  // --- Project Members ---
  await prisma.projectMember.createMany({
    data: [
      { userId: admin.id, projectId: project.id, role: 'OWNER' },
      { userId: alice.id, projectId: project.id, role: 'ADMIN' },
      { userId: bob.id, projectId: project.id, role: 'MEMBER' },
      { userId: charlie.id, projectId: project.id, role: 'MEMBER' },
    ],
  });

  console.log('Created 4 project members');

  // --- Labels ---
  const [labelBug, labelFeature, labelUrgent] = await Promise.all([
    prisma.label.create({
      data: { name: 'Bug', color: '#EF4444', projectId: project.id },
    }),
    prisma.label.create({
      data: { name: 'Feature', color: '#3B82F6', projectId: project.id },
    }),
    prisma.label.create({
      data: { name: 'Urgent', color: '#F59E0B', projectId: project.id },
    }),
  ]);

  console.log('Created 3 labels');

  // --- Sprint ---
  const sprint = await prisma.sprint.create({
    data: {
      name: 'Sprint 1',
      goal: 'Set up core modules and authentication',
      status: 'ACTIVE',
      startDate: new Date('2026-03-20'),
      endDate: new Date('2026-04-03'),
      projectId: project.id,
    },
  });

  console.log(`Created sprint: ${sprint.name}`);

  // --- Issues ---
  const issues = await Promise.all([
    prisma.issue.create({
      data: {
        title: 'Set up NestJS project structure',
        description: 'Initialize project with modules, Prisma, and config',
        issueKey: 'TRK-1',
        issueNumber: 1,
        status: 'DONE',
        priority: 'HIGH',
        type: 'TASK',
        position: 0,
        projectId: project.id,
        reporterId: admin.id,
        assigneeId: alice.id,
        sprintId: sprint.id,
      },
    }),
    prisma.issue.create({
      data: {
        title: 'Implement JWT authentication',
        description: 'Register, login, refresh, logout endpoints',
        issueKey: 'TRK-2',
        issueNumber: 2,
        status: 'DONE',
        priority: 'HIGHEST',
        type: 'STORY',
        position: 1,
        projectId: project.id,
        reporterId: admin.id,
        assigneeId: bob.id,
        sprintId: sprint.id,
      },
    }),
    prisma.issue.create({
      data: {
        title: 'Create Kanban board API',
        description: 'Board view with drag-and-drop reorder support',
        issueKey: 'TRK-3',
        issueNumber: 3,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        type: 'STORY',
        position: 0,
        projectId: project.id,
        reporterId: alice.id,
        assigneeId: charlie.id,
        sprintId: sprint.id,
      },
    }),
    prisma.issue.create({
      data: {
        title: 'Fix pagination off-by-one error',
        description: 'Page 2 shows duplicate of last item from page 1',
        issueKey: 'TRK-4',
        issueNumber: 4,
        status: 'TODO',
        priority: 'MEDIUM',
        type: 'BUG',
        position: 0,
        projectId: project.id,
        reporterId: bob.id,
        assigneeId: alice.id,
        sprintId: sprint.id,
      },
    }),
    prisma.issue.create({
      data: {
        title: 'Add WebSocket notifications',
        description: 'Real-time push notifications via Socket.io',
        issueKey: 'TRK-5',
        issueNumber: 5,
        status: 'TODO',
        priority: 'MEDIUM',
        type: 'STORY',
        position: 1,
        projectId: project.id,
        reporterId: admin.id,
        sprintId: sprint.id,
      },
    }),
    prisma.issue.create({
      data: {
        title: 'Write API documentation',
        description: 'Ensure all endpoints have Swagger decorators',
        issueKey: 'TRK-6',
        issueNumber: 6,
        status: 'BACKLOG',
        priority: 'LOW',
        type: 'TASK',
        position: 0,
        projectId: project.id,
        reporterId: alice.id,
      },
    }),
  ]);

  console.log(`Created ${issues.length} issues`);

  // --- Issue Labels ---
  await prisma.issueLabel.createMany({
    data: [
      { issueId: issues[3].id, labelId: labelBug.id },
      { issueId: issues[3].id, labelId: labelUrgent.id },
      { issueId: issues[2].id, labelId: labelFeature.id },
      { issueId: issues[4].id, labelId: labelFeature.id },
    ],
  });

  console.log('Created issue-label associations');

  // --- Comments ---
  const parentComment = await prisma.comment.create({
    data: {
      content: 'This is looking good! Can we add rate limiting too?',
      issueId: issues[1].id,
      authorId: alice.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Already done — ThrottlerGuard is applied globally.',
      issueId: issues[1].id,
      authorId: bob.id,
      parentId: parentComment.id,
    },
  });

  console.log('Created 2 comments (with threading)');

  // --- Notifications ---
  await prisma.notification.createMany({
    data: [
      {
        type: 'ISSUE_ASSIGNED',
        title: 'Issue assigned to you',
        message: 'You have been assigned TRK-3: Create Kanban board API',
        userId: charlie.id,
        data: { issueKey: 'TRK-3' },
      },
      {
        type: 'SPRINT_STARTED',
        title: 'Sprint started',
        message: 'Sprint 1 has been started',
        userId: alice.id,
        data: { sprintName: 'Sprint 1' },
      },
      {
        type: 'COMMENT_ADDED',
        title: 'New comment',
        message: 'Alice commented on TRK-2',
        userId: bob.id,
        data: { issueKey: 'TRK-2' },
      },
    ],
  });

  console.log('Created 3 notifications');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
