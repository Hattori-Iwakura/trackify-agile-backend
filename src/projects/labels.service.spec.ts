import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { LabelsService } from './labels.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers/mock-prisma.helper';

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
    it('should create a label', async () => {
      const label = { id: 'label-1', name: 'bug', color: '#FF0000', projectId: 'proj-1' };
      prisma.label.create.mockResolvedValue(label);

      const result = await service.create('proj-1', { name: 'bug', color: '#FF0000' });

      expect(result).toEqual(label);
    });

    it('should throw ConflictException for duplicate label name (P2002)', async () => {
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';
      prisma.label.create.mockRejectedValue(prismaError);

      await expect(
        service.create('proj-1', { name: 'bug', color: '#FF0000' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated labels', async () => {
      prisma.label.findMany.mockResolvedValue([]);
      prisma.label.count.mockResolvedValue(0);

      const result = await service.findAll('proj-1', { page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('update', () => {
    it('should update label name and color', async () => {
      prisma.label.findFirst.mockResolvedValue({ id: 'label-1', projectId: 'proj-1' });
      const updated = { id: 'label-1', name: 'feature', color: '#00FF00' };
      prisma.label.update.mockResolvedValue(updated);

      const result = await service.update('proj-1', 'label-1', { name: 'feature', color: '#00FF00' });

      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException for nonexistent label', async () => {
      prisma.label.findFirst.mockResolvedValue(null);

      await expect(
        service.update('proj-1', 'nonexistent', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when renaming to existing name (P2002)', async () => {
      prisma.label.findFirst.mockResolvedValue({ id: 'label-1', projectId: 'proj-1' });
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';
      prisma.label.update.mockRejectedValue(prismaError);

      await expect(
        service.update('proj-1', 'label-1', { name: 'bug' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete label', async () => {
      prisma.label.findFirst.mockResolvedValue({ id: 'label-1', projectId: 'proj-1' });
      prisma.label.delete.mockResolvedValue({ id: 'label-1' });

      await service.delete('proj-1', 'label-1');

      expect(prisma.label.delete).toHaveBeenCalledWith({
        where: { id: 'label-1' },
      });
    });

    it('should throw NotFoundException for nonexistent label', async () => {
      prisma.label.findFirst.mockResolvedValue(null);

      await expect(
        service.delete('proj-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
