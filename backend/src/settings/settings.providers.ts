import { DataSource } from 'typeorm';
import { Settings } from './settings.entity';
import { DATA_SOURCE } from '../database/database.providers';

export const settingsProviders = [
  {
    provide: 'SETTINGS_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Settings),
    inject: [DATA_SOURCE],
  },
];
