import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { Repository, Between } from 'typeorm';
import { Request } from './request.entity';
import { CreateRequestDto, UpdateRequestDto } from './request.dto';
import { User } from '../users/user.entity';

@Injectable()
export class RequestsService {
  constructor(
    @Inject('REQUESTS_REPOSITORY')
    private requestsRepository: Repository<Request>,
  ) {}

  async createRequest(createRequestDto: CreateRequestDto, user: User): Promise<Request> {
    // Only users can create requests for themselves
    if (user.isAdmin || createRequestDto.user_id === user.id) {
      const newRequest = this.requestsRepository.create(createRequestDto);
      return this.requestsRepository.save(newRequest);
    } else {
      throw new ForbiddenException('You cannot create a request for another user');
    }
  }

  async findAllRequests(user: User): Promise<Request[]> {
    // Admins can see all requests, regular users can only see their own requests
    if (user.isAdmin) {
      return this.requestsRepository.find();
    } else {
      return this.requestsRepository.find({ where: { user_id: user.id } });
    }
  }

  async findRequestsByUser(user_id: string, user: User): Promise<Request[]> {
    // Only admins can view requests made by other users
    if (user.isAdmin || user.id === user_id) {
      return this.requestsRepository.find({ where: { user_id } });
    } else {
      throw new ForbiddenException('You can only view your own requests');
    }
  }

  async findRequestsByMediaId(media_id: number, status?: string): Promise<Request[]> {
    const whereCondition: any = { media_id };
  
    if (status) {
      whereCondition.status = status;
    }
  
    const requests = await this.requestsRepository.find({ where: whereCondition });
    
    if (requests.length === 0) {
      const message = status
        ? `No requests found for media ID ${media_id} with status "${status}".`
        : `No requests found for media ID ${media_id}.`;
      throw new ForbiddenException(message);
    }
  
    return requests;
  }
  
  

  async updateRequest(id: number, updateRequestDto: UpdateRequestDto, user: User): Promise<Request> {
    // Only admins can update any request, regular users cannot modify requests
    const request = await this.requestsRepository.findOne({ where: { id } });

    // Check if the user is allowed to update this request
    if (user.isAdmin) {
      await this.requestsRepository.update(id, updateRequestDto);
      return this.requestsRepository.findOne({ where: { id } });
    } else {
      throw new ForbiddenException('You are not allowed to update this request.');
    }
  }

  async deleteRequest(id: number, user: User): Promise<{ message: string }> {
    const request = await this.requestsRepository.findOne({ where: { id } });
  
    if (!request) {
      throw new ForbiddenException('Request not found');
    }
  
    // Only admins or owners can delete a request
    if (user.isAdmin || request.user_id === user.id) {
      await this.requestsRepository.delete(id);
      return { message: 'Request successfully deleted' };
    } else {
      throw new ForbiddenException('You can only delete your own requests');
    }
  }

  async countRequestsInPeriodForUser(userId: string, days: number, currentUser: User): Promise<number> {
    // Only admins or the user concerned can access this information.
    if (!currentUser.isAdmin && currentUser.id !== userId) {
      throw new ForbiddenException('You are not allowed to view requests for this user');
    }

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);

    return this.requestsRepository.count({
      where: {
        user_id: userId,
        created_at: Between(startDate, now),
      },
    });
  }

}
