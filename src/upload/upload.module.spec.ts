import { Test } from '@nestjs/testing';
import { UploadModule } from './upload.module';

describe('UploadModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [UploadModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
