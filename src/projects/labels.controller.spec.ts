import { Test, TestingModule } from '@nestjs/testing';
import { LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';
import { ProjectRoleGuard } from './guards/project-role.guard';

describe('LabelsController', () => {
  let controller: LabelsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LabelsController],
      providers: [{ provide: LabelsService, useValue: service }],
    })
      .overrideGuard(ProjectRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LabelsController>(LabelsController);
  });

  describe('POST /projects/:projectId/labels', () => {
    it('should create label', async () => {
      const dto = { name: 'bug', color: '#FF0000' };
      const result = { id: 'label-1', ...dto, projectId: 'proj-1' };
      service.create.mockResolvedValue(result);

      const response = await controller.create('proj-1', dto);

      expect(service.create).toHaveBeenCalledWith('proj-1', dto);
      expect(response).toEqual(result);
    });
  });

  describe('GET /projects/:projectId/labels', () => {
    it('should return paginated labels', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.findAll.mockResolvedValue(result);

      const response = await controller.findAll('proj-1', { page: 1, limit: 20 });

      expect(service.findAll).toHaveBeenCalledWith('proj-1', { page: 1, limit: 20 });
      expect(response).toEqual(result);
    });
  });

  describe('PATCH /projects/:projectId/labels/:labelId', () => {
    it('should update label', async () => {
      const dto = { name: 'feature' };
      const result = { id: 'label-1', name: 'feature', color: '#FF0000' };
      service.update.mockResolvedValue(result);

      const response = await controller.update('proj-1', 'label-1', dto);

      expect(service.update).toHaveBeenCalledWith('proj-1', 'label-1', dto);
      expect(response).toEqual(result);
    });
  });

  describe('DELETE /projects/:projectId/labels/:labelId', () => {
    it('should delete label', async () => {
      service.delete.mockResolvedValue({ id: 'label-1' });

      await controller.delete('proj-1', 'label-1');

      expect(service.delete).toHaveBeenCalledWith('proj-1', 'label-1');
    });
  });
});
