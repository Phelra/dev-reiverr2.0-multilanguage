import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards, Query } from '@nestjs/common';
import { CarouselService } from './carousel.service';
import { CreateCarouselDto } from './carousel.dto';
import { AuthGuard, GetUser } from '../auth/auth.guard';
import { User } from '../users/user.entity';

@Controller('carousels')
@UseGuards(AuthGuard)
export class CarouselController {
  constructor(private readonly carouselService: CarouselService) {}

  @Post()
  create(@Body() createCarouselDto: CreateCarouselDto, @GetUser() user: User) {
    return this.carouselService.create(createCarouselDto);
  }

  @Get()
  findAll() {
    return this.carouselService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.carouselService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCarouselDto: CreateCarouselDto, @GetUser() user: User) {
    return this.carouselService.update(+id, updateCarouselDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.carouselService.remove(+id);
  }
}
