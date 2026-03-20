import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectRoleGuard } from './guards/project-role.guard';
import { PrismaService } from '../prisma/prisma.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: service }],
    })
      .overrideGuard(ProjectRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  describe('POST /projects', () => {
    it('should create project and return result', async () => {
      const dto = { name: 'Test', key: 'TP' };
      const result = { id: 'proj-1', ...dto, members: [] };
      service.create.mockResolvedValue(result);

      const response = await controller.create({ id: 'user-1' }, dto);

      expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
      expect(response).toEqual(result);
    });
  });

  describe('GET /projects', () => {
    it('should return paginated projects for current user', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.findAll.mockResolvedValue(result);

      const response = await controller.findAll({ id: 'user-1' }, { page: 1, limit: 20 });

      expect(service.findAll).toHaveBeenCalledWith('user-1', { page: 1, limit: 20 });
      expect(response).toEqual(result);
    });
  });

  describe('GET /projects/:projectId', () => {
    it('should return project details', async () => {
      const result = { id: 'proj-1', name: 'Test', _count: { members: 2, labels: 3 } };
      service.findOne.mockResolvedValue(result);

      const response = await controller.findOne('proj-1');

      expect(service.findOne).toHaveBeenCalledWith('proj-1');
      expect(response).toEqual(result);
    });
  });

  describe('PATCH /projects/:projectId', () => {
    it('should update project', async () => {
      const dto = { name: 'Updated' };
      const result = { id: 'proj-1', name: 'Updated' };
      service.update.mockResolvedValue(result);

      const response = await controller.update('proj-1', dto);

      expect(service.update).toHaveBeenCalledWith('proj-1', dto);
      expect(response).toEqual(result);
    });
  });

  describe('DELETE /projects/:projectId', () => {
    it('should delete project', async () => {
      service.delete.mockResolvedValue({ id: 'proj-1' });

      const response = await controller.delete('proj-1');

      expect(service.delete).toHaveBeenCalledWith('proj-1');
    });
  });
});
