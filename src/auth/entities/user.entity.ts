import { Product } from '../../products/entities/product.entity';
import {
  BeforeInsert,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  email: string;

  @Column('text', { select: false })
  password: string;

  @Column('text')
  fullName: string;

  @Column('bool', { default: true })
  isActive: boolean;

  @Column('text', { array: true, default: ['user'] })
  roles: string[];

  @OneToMany(() => Product, (product) => product.user)
  product: Product;

  @Column('text', { nullable: true })
  temporalTokenKey: string | null;

  @BeforeInsert()
  checkFieldsBeforeInsert() {
    this.email = this.email.toLowerCase().trim();
  }

  @BeforeInsert()
  checkFieldsBeforeUpdate() {
    this.checkFieldsBeforeInsert();
  }
}
