import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrismaService } from '../../../test/helpers/mock-prisma.helper';

describe('LabelsService', () => {
  let service: LabelsService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LabelsService>(LabelsService);
  });

  describe('create', () => {
    it('should create label within project', async () => {
      prisma.label.findUnique.mockResolvedValue(null);
      prisma.label.create.mockResolvedValue({
        id: 'label-1',
        name: 'bug',
        color: '#ff0000',
        projectId: 'proj-1',
      });

      const result = await service.create('proj-1', { name: 'bug', color: '#ff0000' });

      expect(result.name).toBe('bug');
      expect(result.color).toBe('#ff0000');
    });

    it('should throw ConflictException for duplicate name in same project', async () => {
      prisma.label.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('proj-1', { name: 'bug', color: '#ff0000' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all labels for project', async () => {
      prisma.label.findMany.mockResolvedValue([
        { id: 'label-1', name: 'bug', color: '#ff0000' },
        { id: 'label-2', name: 'feature', color: '#00ff00' },
      ]);

      const result = await service.findAll('proj-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update label name and color', async () => {
      prisma.label.update.mockResolvedValue({
        id: 'label-1',
        name: 'critical',
        color: '#ff0000',
      });

      const result = await service.update('label-1', { name: 'critical' });

      expect(result.name).toBe('critical');
    });
  });

  describe('remove', () => {
    it('should delete label', async () => {
      prisma.label.delete.mockResolvedValue({ id: 'label-1' });

      await expect(service.remove('label-1')).resolves.not.toThrow();
    });
  });
});
