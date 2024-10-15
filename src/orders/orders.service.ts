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
import { NATS_SERVICE } from 'src/config';
import { catchError, firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces/order-with-products.interface';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database');
  }

  private async validateProducts(ids: number[]) {
    const products: any[] = await firstValueFrom(
      this.client.send({ cmd: 'validate_products' }, ids).pipe(
        catchError((error) => {
          throw new RpcException(error);
        }),
      ),
    );

    return products;
  }

  async create(createOrderDto: CreateOrderDto) {
    const ids = createOrderDto.items.map((item) => item.productId);

    const products: any[] = await this.validateProducts(ids);

    const totalAmount = createOrderDto.items.reduce((acc, item) => {
      const price = products.find(
        (product) => product.id === item.productId,
      ).price;

      return (acc += price * item.quantity);
    }, 0);

    const totalItems = createOrderDto.items.reduce((acc, item) => {
      return (acc += item.quantity);
    }, 0);

    const order = await this.order.create({
      data: {
        totalAmount,
        totalItems,
        OrderItem: {
          createMany: {
            data: createOrderDto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: products.find((product) => product.id === item.productId)
                .price,
            })),
          },
        },
      },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });

    return {
      ...order,
      OrderItem: order.OrderItem.map((item) => ({
        ...item,
        name: products.find((product) => product.id === item.productId).name,
      })),
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
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found`,
      });
    }

    const ids = order.OrderItem.map((item) => item.productId);
    const products: any[] = await this.validateProducts(ids);

    return {
      ...order,
      OrderItem: order.OrderItem.map((item) => ({
        ...item,
        name: products.find((product) => product.id === item.productId).name,
      })),
    };
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

  async createPaymentSession(order: OrderWithProducts) {
    try {
      const session = await firstValueFrom(
        this.client.send('create.payment.session', {
          currency: 'usd',
          items: order.OrderItem.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          orderId: order.id,
        }),
      );

      return session;
    } catch (error) {
      throw new RpcException(error);
    }
  }
}
