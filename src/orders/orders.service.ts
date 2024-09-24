import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChangeStatusDto, CreateOrderDto, OrderPaginationDto } from './dto';
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
    return {
      service: 'Orders Microservice',
      createOrderDto: createOrderDto,
    };

    // return this.order.create({ data: createOrderDto });
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { status, limit, page } = orderPaginationDto;

    const totalPages = await this.order.count({
      where: {
        status,
      },
    });

    const currentPage = page;

    return {
      data: await this.order.findMany({
        where: {
          status,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      meta: {
        total: totalPages,
        currentPage,
        lastPage: Math.ceil(totalPages / limit),
      },
    };
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

    return order;
  }

  async changeOrderStatus(changeStatusDto: ChangeStatusDto) {
    const { id, status } = changeStatusDto;

    const order = await this.findOne(id);

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found`,
      });
    }

    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }
}
