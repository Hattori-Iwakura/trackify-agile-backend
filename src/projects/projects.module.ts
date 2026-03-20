import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';

@Module({
  controllers: [ProjectsController, MembersController, LabelsController],
  providers: [ProjectsService, MembersService, LabelsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
