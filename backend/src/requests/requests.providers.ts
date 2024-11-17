import { DataSource } from 'typeorm';
import { Request } from './request.entity';
import { DATA_SOURCE } from '../database/database.providers';

export const requestProviders = [
  {
    provide: 'REQUESTS_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Request),
    inject: [DATA_SOURCE],
  },
];
