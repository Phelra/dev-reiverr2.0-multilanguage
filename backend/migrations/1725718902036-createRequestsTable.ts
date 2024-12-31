import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRequestsTable1662976543210 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id VARCHAR NOT NULL,
                media_id INT NOT NULL,
                media_type INT NOT NULL,
                season INT NULL,
                episode INT NULL,
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_user_requests FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
            );
            CREATE INDEX idx_user_requests ON requests (user_id);
            CREATE INDEX idx_media_requests ON requests (media_id);
            CREATE INDEX idx_status_requests ON requests (status);
            CREATE INDEX idx_media_type_requests ON requests (media_type);
            CREATE INDEX idx_season_requests ON requests (season);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE requests`);
    }
}

