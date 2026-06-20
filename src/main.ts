import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const validationPipe: ValidationPipe = new ValidationPipe({
    whitelist: true, // Strip properties not in DTO
    forbidNonWhitelisted: true, // Throw error for unknown properties
    transform: true, // Auto-transform payloads to DTO instances
  });

  app.useGlobalPipes(validationPipe);

  await app.listen(3000);

  console.log('Application is running on: http://localhost:3000');
}
bootstrap();
