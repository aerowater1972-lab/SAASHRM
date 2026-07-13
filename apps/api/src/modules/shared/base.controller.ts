import { Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { PaginationDto } from './dto/pagination.dto';
import { ApiResponse } from './dto/api-response.dto';

export class BaseController {
  constructor(protected readonly service: any) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query() pagination: PaginationDto): Promise<ApiResponse<any[]>> {
    const result = await this.service.findAll(pagination);
    return ApiResponse.ok(result.data, 'Records retrieved successfully', result.meta);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<any>> {
    const data = await this.service.findOne(id);
    return ApiResponse.ok(data, 'Record retrieved successfully');
  }

  @Post()
  @ApiBody({ type: Object })
  async create(@Body() dto: any): Promise<ApiResponse<any>> {
    const data = await this.service.create(dto);
    return ApiResponse.ok(data, 'Record created successfully');
  }

  @Put(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: Object })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any): Promise<ApiResponse<any>> {
    const data = await this.service.update(id, dto);
    return ApiResponse.ok(data, 'Record updated successfully');
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: String })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<null>> {
    await this.service.remove(id);
    return ApiResponse.ok(null, 'Record deleted successfully');
  }
}
