import { Test } from '@nestjs/testing';
import { NotificationsModule } from './notifications.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './gateway/notifications.gateway';

describe('NotificationsModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [NotificationsModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should have NotificationsController defined', async () => {
    const module = await Test.createTestingModule({
      imports: [NotificationsModule],
    }).compile();

    expect(module.get<NotificationsController>(NotificationsController)).toBeDefined();
  });

  it('should have NotificationsService defined', async () => {
    const module = await Test.createTestingModule({
      imports: [NotificationsModule],
    }).compile();

    expect(module.get<NotificationsService>(NotificationsService)).toBeDefined();
  });

  it('should have NotificationsGateway defined', async () => {
    const module = await Test.createTestingModule({
      imports: [NotificationsModule],
    }).compile();

    expect(module.get<NotificationsGateway>(NotificationsGateway)).toBeDefined();
  });
});
