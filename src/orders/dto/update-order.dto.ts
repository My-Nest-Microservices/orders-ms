import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto.ts';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  id: number;
}
