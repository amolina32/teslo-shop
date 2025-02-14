import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', { unique: true, nullable: false })
    title: string;

    @Column('float', { nullable: false, default: 0 })
    price: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: false, unique: true })
    slug: string;

    @Column('int', { nullable: false, default: 0 })
    stock: number;

    @Column('text', { array: true, nullable: true })
    sizes: string[];

    @Column('text')
    gender: string;

    @Column('text', { array: true,default: [] })
    tags: string[];

    @BeforeInsert()
    generateSlug() {
        this.slug = this.slug || this.title;
        this.slug = this.slug.toLowerCase().replaceAll(' ', '_').replaceAll("'", '');
    }

    @BeforeUpdate()
    updateSlug() {
        this.slug = this.slug.toLowerCase().replaceAll(' ', '_').replaceAll("'", '');
    }
}
