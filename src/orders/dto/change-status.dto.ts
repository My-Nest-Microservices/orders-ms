import { IsEnum, IsUUID } from 'class-validator';
import { OrderStatus, OrderStatusList } from 'src/enum/order.enum';

export class ChangeStatusDto {
  @IsEnum(OrderStatusList, {
    message: (args) =>
      `${args.value} is not a valid status, possible status values: ${OrderStatusList}`,
  })
  status: OrderStatus;

  @IsUUID()
  id: string;
}
