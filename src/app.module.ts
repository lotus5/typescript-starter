import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';
import { Event } from './events/entities/event.entity';
import { User } from './users/entities/users.entity';

@Module({
  imports: [
    // 1. Initialize the ConfigModule to read your .env file
    ConfigModule.forRoot({
      isGlobal: true, // Makes environment variables available everywhere
    }),

    // 2. Configure TypeORM securely using the ConfigService
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [Event, User], // Tells TypeORM which tables to build
        synchronize: configService.get<string>('NODE_ENV') !== 'production', // Set to false in production!
      }),
    }),

    // 3. Register your feature modules
    EventsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
