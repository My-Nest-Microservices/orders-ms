import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ChangeStatusDto, CreateOrderDto, OrderPaginationDto } from './dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PRODUCT_SERVICE } from 'src/config';
import { catchError } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  constructor(@Inject(PRODUCT_SERVICE) private productClient: ClientProxy) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database');
  }

  async create(createOrderDto: CreateOrderDto) {
    const ids = createOrderDto.items.map((item) => item.productId);

    const products = this.productClient
      .send({ cmd: 'validate_products' }, ids)
      .pipe(
        catchError((err) => {
          throw new RpcException(err);
        }),
      );

    return products;

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
