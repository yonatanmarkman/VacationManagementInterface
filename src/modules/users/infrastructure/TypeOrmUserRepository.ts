/**
 * TypeORM implementation of UserRepository.
 */
import { In } from 'typeorm';
import type { EntityManager, Repository } from 'typeorm';
import type { Page, PageRequest } from '../../../shared/persistence/pagination';
import { offsetOf } from '../../../shared/persistence/pagination';
import { User } from '../domain/User';
import type { UserListFilter, UserRepository } from '../domain/UserRepository';

export class TypeOrmUserRepository implements UserRepository {
  private readonly repository: Repository<User>;

  constructor(manager: EntityManager) {
    this.repository = manager.getRepository(User);
  }

  findById(id: number): Promise<User | null> {
    return this.repository.findOne({ where: { id }, relations: { team: true } });
  }

  findByIds(ids: readonly number[]): Promise<User[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.find({ where: { id: In([...ids]) }, relations: { team: true } });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('member')
      .addSelect('member.password')
      .leftJoinAndSelect('member.team', 'team')
      .where('member.email = :email', { email })
      .getOne();
  }

  findTeamMembers(teamId: number): Promise<User[]> {
    return this.repository.find({ where: { teamId }, order: { name: 'ASC', id: 'ASC' } });
  }

  async list(filter: UserListFilter, page: PageRequest): Promise<Page<User>> {
    const query = this.repository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.team', 'team')
      .orderBy('member.name', 'ASC')
      .addOrderBy('member.id', 'ASC')
      .offset(offsetOf(page))
      .limit(page.limit);
    if (filter.teamId !== undefined) {
      query.andWhere('member.team_id = :teamId', { teamId: filter.teamId });
    }
    if (filter.role !== undefined) {
      query.andWhere(':role = ANY(member.roles)', { role: filter.role });
    }
    const [items, totalItems] = await query.getManyAndCount();
    return { items, totalItems };
  }
}
