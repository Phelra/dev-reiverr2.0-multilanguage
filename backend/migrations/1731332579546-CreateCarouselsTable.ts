import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCarouselsTable1731332579546 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'carousels',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'carouselName',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'filterType',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'genre',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'tag',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'sortBy',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'libraryPath',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'studio',
            type: 'json', 
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('carousels');
  }
}
