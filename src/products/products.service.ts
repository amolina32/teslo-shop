import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { DataSource, Repository } from 'typeorm';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { isUUID } from 'class-validator';
import { ProductImage } from './entities/product-image.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class ProductsService {
  private logger = new Logger('ProductsService');
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto, user: User) {
    try {
      const { images = [], ...producDetails } = createProductDto;
      const product = this.productRepository.create({
        ...producDetails,
        images: images.map((image) =>
          this.productImageRepository.create({ url: image }),
        ),
        user
      });
      await this.productRepository.save(product);
      return { ...product, images };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    const { images, ...productDetails } = updateProductDto;

    const product = await this.productRepository.preload({
      id,
      ...productDetails,

    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });
        product.images = images.map((image) =>
          this.productImageRepository.create({ url: image }),
        );
      }
      product.user = user;
      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
      return this.finOnePlane(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const { limit = 10, offset = 0 } = paginationDto;
      const products = await this.productRepository.find({
        take: limit,
        skip: offset,
        relations: { images: true },
      });
      return products.map((product) => ({
        ...product,
        images: product.images?.map((image) => image.url),
      }));
    } catch (error) {
      this.handleExceptions(error);
      throw new InternalServerErrorException(
        'Unnespected error, please check server logs',
      );
    }
  }

  async findOne(term: string) {
    let product: Product | null;

    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      product = await this.productRepository
        .createQueryBuilder('prod')
        .where('lower(title) = :term or slug = :term', {
          term: term.toLowerCase(),
        })
        .leftJoinAndSelect('prod.images', 'images')
        .getOne();
    }

    if (!product) {
      throw new NotFoundException(`Product with ${term} not found`);
    }
    return product;
  }

  async finOnePlane(term: string) {
    const { images = [], ...producDetails } = await this.findOne(term);
    return { ...producDetails, images: images.map((image) => image.url) };
  }

  private handleExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unnespected error, please check server logs',
    );
  }

  async deleteAllProducts() {
    try {
      const queryBuilder = this.productRepository.createQueryBuilder('produc');
      return await queryBuilder.delete().execute();
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
