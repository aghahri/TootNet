import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService, FeedPost } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePostDto,
  ): Promise<FeedPost> {
    return this.posts.create(userId, dto);
  }

  @Get('feed')
  getFeed(@CurrentUser('sub') userId: string): Promise<FeedPost[]> {
    return this.posts.getFeed(userId);
  }
}

