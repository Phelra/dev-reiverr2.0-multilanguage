import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Carousel } from './carousel.entity';
import { CreateCarouselDto, UpdateCarouselDto } from './carousel.dto';

@Injectable()
export class CarouselService {
  constructor(
    @Inject('CAROUSEL_REPOSITORY')
    private carouselRepository: Repository<Carousel>,
  ) {}

  async create(createCarouselDto: CreateCarouselDto): Promise<Carousel> {
    const newCarousel = this.carouselRepository.create(createCarouselDto);
    return this.carouselRepository.save(newCarousel);
  }

  async findAll(): Promise<Carousel[]> {
    return this.carouselRepository.find();
  }

  async findOne(id: number): Promise<Carousel> {
    const carousel = await this.carouselRepository.findOne({ where: { id } });
    if (!carousel) {
      throw new NotFoundException(`Carousel with ID ${id} not found`);
    }
    return carousel;
  }

  async update(id: number, updateCarouselDto: UpdateCarouselDto): Promise<Carousel> {
    const carousel = await this.findOne(id);
    await this.carouselRepository.update(id, updateCarouselDto);
    return this.carouselRepository.findOne({ where: { id } });
  }

  async remove(id: number): Promise<{ message: string }> {
    const carousel = await this.findOne(id);
    await this.carouselRepository.delete(id);
    return { message: 'Carousel successfully deleted' };
  }
}
