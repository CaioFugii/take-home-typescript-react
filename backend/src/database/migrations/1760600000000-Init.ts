import type { MigrationInterface, QueryRunner } from 'typeorm'

const statements = [
  `CREATE TYPE "UserRole" AS ENUM ('admin', 'viewer')`,
  `CREATE TYPE "ProductCategory" AS ENUM ('meal', 'drink', 'dessert', 'side')`,
  `CREATE TYPE "OrderStatus" AS ENUM ('pending', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled')`,
  `CREATE TYPE "VehicleType" AS ENUM ('bicycle', 'motorcycle', 'car')`,
  `CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "image_url" VARCHAR(500),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "preparation_time" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE "delivery_persons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "current_lat" DECIMAL(10,8),
    "current_lng" DECIMAL(11,8),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_persons_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_name" VARCHAR(100) NOT NULL,
    "customer_phone" VARCHAR(20) NOT NULL,
    "delivery_address" VARCHAR(300) NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "total_amount" DECIMAL(10,2) NOT NULL,
    "delivery_person_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE "order_status_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX "users_email_key" ON "users"("email")`,
  `CREATE INDEX "idx_users_email" ON "users"("email")`,
  `CREATE INDEX "idx_products_category" ON "products"("category")`,
  `CREATE INDEX "idx_products_is_available" ON "products"("is_available")`,
  `CREATE INDEX "idx_products_name" ON "products"("name")`,
  `CREATE INDEX "idx_products_created_at" ON "products"("created_at" DESC)`,
  `CREATE INDEX "idx_delivery_persons_is_active" ON "delivery_persons"("is_active")`,
  `CREATE INDEX "idx_orders_status" ON "orders"("status")`,
  `CREATE INDEX "idx_orders_created_at" ON "orders"("created_at" DESC)`,
  `CREATE INDEX "idx_orders_delivery_person_id" ON "orders"("delivery_person_id")`,
  `CREATE INDEX "idx_orders_status_created" ON "orders"("status", "created_at")`,
  `CREATE INDEX "idx_order_items_order_id" ON "order_items"("order_id")`,
  `CREATE INDEX "idx_order_items_product_id" ON "order_items"("product_id")`,
  `CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash")`,
  `CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id")`,
  `CREATE INDEX "idx_order_status_events_order_status" ON "order_status_events"("order_id", "to_status")`,
  `ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_person_id_fkey" FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_persons"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "products" ADD CONSTRAINT "products_price_positive" CHECK ("price" > 0)`,
  `ALTER TABLE "products" ADD CONSTRAINT "products_preparation_time_range" CHECK ("preparation_time" BETWEEN 1 AND 120)`,
  `ALTER TABLE "orders" ADD CONSTRAINT "orders_total_amount_positive" CHECK ("total_amount" > 0)`,
  `ALTER TABLE "orders" ADD CONSTRAINT "orders_latitude_range" CHECK ("latitude" BETWEEN -90 AND 90)`,
  `ALTER TABLE "orders" ADD CONSTRAINT "orders_longitude_range" CHECK ("longitude" BETWEEN -180 AND 180)`,
  `ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0)`,
  `ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_price_positive" CHECK ("unit_price" > 0)`,
]

export class Init1760600000000 implements MigrationInterface {
  name = 'Init1760600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of statements) {
      await queryRunner.query(statement)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP SCHEMA public CASCADE')
    await queryRunner.query('CREATE SCHEMA public')
  }
}
