import { DataSource } from 'typeorm';
import { Carousel } from './carousel.entity';

export const carouselProviders = [
  {
    provide: 'CAROUSEL_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Carousel),
    inject: ['DATA_SOURCE'],
  },
];
