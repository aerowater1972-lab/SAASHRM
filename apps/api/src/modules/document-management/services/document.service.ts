import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  DocumentStatus,
  DocumentAction,
  SignatureStatus,
  DocumentAccessLevel,
} from '@prisma/client';
import {
  CreateDocumentCategoryDto,
  UpdateDocumentCategoryDto,
  CreateDocumentDto,
  UpdateDocumentDto,
  UpdateDocumentStatusDto,
  CreateDocumentVersionDto,
  AddDocumentPermissionDto,
  UpdateDocumentPermissionDto,
  SignDocumentDto,
  LogDocumentActivityDto,
} from '../dto/document.dto';

@Injectable()
export class DocumentService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Categories ----------
  async listCategories(tenantId: string) {
    return this.prisma.documentCategory.findMany({
      where: { tenantId, deletedAt: null },
      include: { _count: { select: { documents: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getCategory(tenantId: string, id: string) {
    const category = await this.prisma.documentCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { _count: { select: { documents: true } } },
    });
    if (!category) throw new NotFoundException('Document category not found');
    return category;
  }

  async createCategory(tenantId: string, userId: string, dto: CreateDocumentCategoryDto) {
    return this.prisma.documentCategory.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        color: dto.color ?? '#6366F1',
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateCategory(tenantId: string, id: string, dto: UpdateDocumentCategoryDto) {
    const existing = await this.prisma.documentCategory.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Document category not found');
    return this.prisma.documentCategory.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description !== undefined ? dto.description : existing.description,
        icon: dto.icon !== undefined ? dto.icon : existing.icon,
        color: dto.color ?? existing.color,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        isActive: dto.isActive ?? existing.isActive,
      },
    });
  }

  async deleteCategory(tenantId: string, id: string) {
    const existing = await this.prisma.documentCategory.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Document category not found');
    await this.prisma.document.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    await this.prisma.documentCategory.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  // ---------- Documents ----------
  async findAll(tenantId: string, userId: string, filters: {
    categoryId?: string;
    status?: string;
    search?: string;
    departmentId?: string;
    isTemplate?: string;
  }) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.status) where.status = filters.status;
    if (filters.isTemplate !== undefined) where.isTemplate = filters.isTemplate === 'true';
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.document.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        creator: { select: { id: true, fullName: true, email: true } },
        versions: { orderBy: { version: 'desc' }, take: 1 },
        _count: { select: { versions: true, signatures: true, permissions: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async findById(tenantId: string, id: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: true,
        department: { select: { id: true, name: true } },
        creator: { select: { id: true, fullName: true, email: true } },
        versions: { orderBy: { version: 'desc' } },
        permissions: true,
        signatures: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async create(tenantId: string, userId: string, dto: CreateDocumentDto) {
    if (dto.categoryId) {
      const category = await this.prisma.documentCategory.findFirst({ where: { id: dto.categoryId, tenantId, deletedAt: null } });
      if (!category) throw new BadRequestException('Invalid category');
    }
    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({ where: { id: dto.departmentId, tenantId } });
      if (!department) throw new BadRequestException('Invalid department');
    }

    const data: any = {
      tenantId,
      title: dto.title,
      description: dto.description ?? null,
      content: dto.content ?? null,
      categoryId: dto.categoryId ?? null,
      departmentId: dto.departmentId ?? null,
      accessLevel: dto.accessLevel ?? DocumentAccessLevel.TENANT,
      tags: dto.tags ?? [],
      isTemplate: dto.isTemplate ?? false,
      createdById: userId,
      status: dto.status ?? DocumentStatus.DRAFT,
      version: 1,
    };
    if (data.status === DocumentStatus.PUBLISHED) data.publishedAt = new Date();

    const document = await this.prisma.document.create({
      data,
      include: { creator: { select: { id: true, fullName: true } } },
    });

    await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        title: dto.title,
        content: dto.content ?? '',
        changeLog: 'Initial version',
        createdById: userId,
      },
    });

    await this.prisma.documentActivity.create({
      data: { documentId: document.id, userId, action: DocumentAction.CREATED, details: { title: dto.title } },
    });

    return document;
  }

  async update(tenantId: string, id: string, userId: string, dto: UpdateDocumentDto) {
    const existing = await this.prisma.document.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Document not found');

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;
    if (dto.accessLevel !== undefined) data.accessLevel = dto.accessLevel;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.content !== undefined) {
      if (dto.content !== existing.content) {
        const newVersion = existing.version + 1;
        await this.prisma.documentVersion.create({
          data: {
            documentId: id,
            version: newVersion,
            title: existing.title,
            content: dto.content,
            changeLog: dto.changeLog ?? 'Content updated',
            createdById: userId,
          },
        });
        data.version = newVersion;
      }
    }

    const document = await this.prisma.document.update({ where: { id }, data });

    await this.prisma.documentActivity.create({
      data: { documentId: id, userId, action: DocumentAction.UPDATED, details: dto as any },
    });

    return document;
  }

  async updateStatus(tenantId: string, id: string, userId: string, dto: UpdateDocumentStatusDto) {
    const existing = await this.prisma.document.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Document not found');

    const data: any = { status: dto.status };
    if (dto.status === DocumentStatus.PUBLISHED) data.publishedAt = new Date();

    const document = await this.prisma.document.update({ where: { id }, data });

    const action =
      dto.status === DocumentStatus.PUBLISHED
        ? DocumentAction.PUBLISHED
        : dto.status === DocumentStatus.ARCHIVED
          ? DocumentAction.ARCHIVED
          : DocumentAction.UPDATED;

    await this.prisma.documentActivity.create({
      data: { documentId: id, userId, action, details: { status: dto.status } },
    });

    return document;
  }

  async delete(tenantId: string, id: string, userId: string) {
    const existing = await this.prisma.document.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Document not found');
    await this.prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.documentActivity.create({
      data: { documentId: id, userId, action: DocumentAction.ARCHIVED, details: { deleted: true } },
    });
    return { deleted: true };
  }

  // ---------- Versions ----------
  async createVersion(tenantId: string, id: string, userId: string, dto: CreateDocumentVersionDto) {
    const existing = await this.prisma.document.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Document not found');

    const nextVersion = existing.version + 1;
    const version = await this.prisma.documentVersion.create({
      data: {
        documentId: id,
        version: nextVersion,
        title: dto.title ?? existing.title,
        content: dto.content,
        changeLog: dto.changeLog ?? null,
        createdById: userId,
      },
    });

    await this.prisma.document.update({
      where: { id },
      data: { version: nextVersion, content: dto.content, title: dto.title ?? existing.title },
    });

    await this.prisma.documentActivity.create({
      data: { documentId: id, userId, action: DocumentAction.VERSION_CREATED, details: { version: nextVersion } },
    });

    return version;
  }

  // ---------- Permissions ----------
  async addPermission(tenantId: string, id: string, userId: string, dto: AddDocumentPermissionDto) {
    const existing = await this.prisma.document.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Document not found');

    const permission = await this.prisma.documentPermission.create({
      data: {
        documentId: id,
        permissionType: dto.permissionType,
        targetId: dto.targetId,
        permission: dto.permission ?? 'VIEW',
        createdById: userId,
      },
    });

    await this.prisma.documentActivity.create({
      data: { documentId: id, userId, action: DocumentAction.SHARED, details: dto as any },
    });

    return permission;
  }

  async updatePermission(tenantId: string, id: string, permissionId: string, dto: UpdateDocumentPermissionDto) {
    const permission = await this.prisma.documentPermission.findFirst({
      where: { id: permissionId, documentId: id },
      include: { document: true },
    });
    if (!permission || permission.document.tenantId !== tenantId) {
      throw new NotFoundException('Document permission not found');
    }
    return this.prisma.documentPermission.update({
      where: { id: permissionId },
      data: { permission: dto.permission ?? permission.permission },
    });
  }

  async removePermission(tenantId: string, id: string, permissionId: string) {
    const permission = await this.prisma.documentPermission.findFirst({
      where: { id: permissionId, documentId: id },
      include: { document: true },
    });
    if (!permission || permission.document.tenantId !== tenantId) {
      throw new NotFoundException('Document permission not found');
    }
    await this.prisma.documentPermission.delete({ where: { id: permissionId } });
    return { deleted: true };
  }

  // ---------- Signatures ----------
  async requestSignatures(tenantId: string, id: string, userIds: string[]) {
    const existing = await this.prisma.document.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Document not found');

    const signature = await this.prisma.documentSignature.create({
      data: {
        documentId: id,
        documentVersion: existing.version,
        userId: userIds[0],
        status: SignatureStatus.PENDING,
      },
    });
    return signature;
  }

  async sign(tenantId: string, id: string, userId: string, dto: SignDocumentDto) {
    const existing = await this.prisma.document.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Document not found');

    const signature = await this.prisma.documentSignature.findFirst({
      where: { documentId: id, userId },
    });
    if (!signature) {
      throw new NotFoundException('No signature request for this user');
    }

    const signed = await this.prisma.documentSignature.update({
      where: { id: signature.id },
      data: {
        status: dto.status,
        signatureData: dto.signatureData ?? null,
        signedAt: new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.prisma.documentActivity.create({
      data: { documentId: id, userId, action: DocumentAction.SIGNED, details: { status: dto.status } },
    });

    return signed;
  }

  // ---------- Activities ----------
  async listActivities(tenantId: string, id: string) {
    const existing = await this.prisma.document.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Document not found');
    return this.prisma.documentActivity.findMany({
      where: { documentId: id },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async logActivity(tenantId: string, id: string, userId: string, dto: LogDocumentActivityDto) {
    const existing = await this.prisma.document.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Document not found');
    return this.prisma.documentActivity.create({
      data: {
        documentId: id,
        userId,
        action: dto.action,
        details: dto.details ?? undefined,
        ipAddress: dto.ipAddress ?? null,
      },
    });
  }
}