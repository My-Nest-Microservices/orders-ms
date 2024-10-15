import { Controller, ParseUUIDPipe } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { ChangeStatusDto, CreateOrderDto, OrderPaginationDto } from './dto';
import { PaymentSucceededInterface } from './interfaces/payment-succeeded.interface';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('createOrder')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    const paymentSession = await this.ordersService.createPaymentSession(order);
    return { order, paymentSession };
  }

  @MessagePattern('findAllOrders')
  findAll(@Payload() orderPaginationDto: OrderPaginationDto) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern('findOneOrder')
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern('changeOrderStatus')
  changeOrderStatus(@Payload() changeStatusDto: ChangeStatusDto) {
    return this.ordersService.changeOrderStatus(changeStatusDto);
  }

  @EventPattern('payment.succeeded')
  async handlePaymentSuccess(
    @Payload() paidOrderDto: PaymentSucceededInterface,
  ) {
    console.log({ paidOrderDto });
  }
}
