import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto';
import { PrismaClient } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');
  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database');
  }
  create(createOrderDto: CreateOrderDto) {
    return this.order.create({ data: createOrderDto });
  }

  findAll() {
    return this.order.findMany({});
  }

  async findOne(id: string) {
    const order = await this.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found`,
      });
    }

    return this.order.findUnique({ where: { id } });
  }
}
