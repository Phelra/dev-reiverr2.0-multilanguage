import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards, Query } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto, UpdateRequestDto } from './request.dto';
import { AuthGuard, GetUser } from '../auth/auth.guard';
import { User } from '../users/user.entity';

@Controller('requests')
@UseGuards(AuthGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  create(@Body() createRequestDto: CreateRequestDto, @GetUser() user: User) {
    return this.requestsService.createRequest(createRequestDto, user);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.requestsService.findAllRequests(user);
  }

  @Get(':user_id')
  findByUser(@Param('user_id') user_id: string, @GetUser() user: User) {
    return this.requestsService.findRequestsByUser(user_id, user);
  }


  @Get('/media/:media_id')
async findRequestsByMediaId(
  @Param('media_id') media_id: number,
  @Query('status') status?: string,
) {
  return this.requestsService.findRequestsByMediaId(media_id, status);
}


  @Get('count/:user_id')
  countRequestsInPeriodForUser(
    @Param('user_id') user_id: string,
    @GetUser() user: User,
    @Query('days') days: number
  ) {
    return this.requestsService.countRequestsInPeriodForUser(user_id, days, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRequestDto: UpdateRequestDto, @GetUser() user: User) {
    return this.requestsService.updateRequest(+id, updateRequestDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.requestsService.deleteRequest(+id, user);
  }
}
