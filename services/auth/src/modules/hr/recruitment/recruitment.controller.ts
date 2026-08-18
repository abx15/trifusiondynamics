import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RecruitmentStage } from '@prisma/client';

@Controller('hr/recruitment')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post()
  @RequirePermission('hr:write')
  create(@Body() dto: CreateCandidateDto, @CurrentUser('orgId') orgId: string) {
    return this.recruitmentService.create(dto, orgId);
  }

  @Get()
  @RequirePermission('hr:read')
  findAll(
    @CurrentUser('orgId') orgId: string,
    @Query('stage') stage?: RecruitmentStage,
  ) {
    return this.recruitmentService.findAll(orgId, stage);
  }

  @Patch(':id/stage')
  @RequirePermission('hr:write')
  updateStage(
    @Param('id') id: string,
    @Body() dto: MoveStageDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.recruitmentService.updateStage(id, dto, orgId);
  }
}
