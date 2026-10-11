import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PunchDto } from './dto/punch.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private getLocationString(dto: PunchDto): string {
    if (!dto.location) return 'Web Portal';
    if (typeof dto.location === 'string') return dto.location;
    // LocationDto object
    return `Lat: ${dto.location.lat}, Lng: ${dto.location.lng}`;
  }

  async checkIn(
    employeeId: string,
    orgId: string,
    dto: PunchDto,
  ): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
    );

    const latestToday = await this.prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        timestamp: { gte: startOfDay },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (latestToday && latestToday.type === 'CHECK_IN') {
      throw new BadRequestException('You are already checked in.');
    }

    const record = await this.prisma.attendanceRecord.create({
      data: {
        employeeId,
        organizationId: orgId,
        type: 'CHECK_IN',
        location: this.getLocationString(dto),
        timestamp: new Date(),
      },
    });

    return {
      id: record.id,
      employeeId: record.employeeId,
      organizationId: record.organizationId,
      type: 'check_in',
      location: record.location,
      timestamp: record.timestamp,
    };
  }

  async checkOut(
    employeeId: string,
    orgId: string,
    dto: PunchDto,
  ): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
    );

    const latestToday = await this.prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        timestamp: { gte: startOfDay },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!latestToday || latestToday.type !== 'CHECK_IN') {
      throw new BadRequestException('You must check in before checking out.');
    }

    const record = await this.prisma.attendanceRecord.create({
      data: {
        employeeId,
        organizationId: orgId,
        type: 'CHECK_OUT',
        location: this.getLocationString(dto),
        timestamp: new Date(),
      },
    });

    return {
      id: record.id,
      employeeId: record.employeeId,
      organizationId: record.organizationId,
      type: 'check_out',
      location: record.location,
      timestamp: record.timestamp,
    };
  }

  async getTodayStatus(
    employeeId: string,
  ): Promise<{ isCheckedIn: boolean; punches: any[] }> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    const latest = records[records.length - 1];
    const isCheckedIn = latest?.type === 'CHECK_IN';

    return {
      isCheckedIn,
      punches: records.map((r) => ({
        id: r.id,
        type: r.type.toLowerCase(),
        location: r.location,
        timestamp: r.timestamp,
      })),
    };
  }

  async getMonthlySummary(
    employeeId: string,
    month: number,
    year: number,
  ): Promise<any> {
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        timestamp: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Calculate total hours worked
    let totalMs = 0;
    let lateCount = 0;
    let lastCheckIn: Date | null = null;

    for (const r of records) {
      if (r.type === 'CHECK_IN') {
        lastCheckIn = new Date(r.timestamp);
        // Late if check in is past 09:30 AM local time
        const hours = lastCheckIn.getHours();
        const minutes = lastCheckIn.getMinutes();
        if (hours > 9 || (hours === 9 && minutes > 30)) {
          lateCount++;
        }
      } else if (r.type === 'CHECK_OUT' && lastCheckIn) {
        const checkOutTime = new Date(r.timestamp);
        const diff = checkOutTime.getTime() - lastCheckIn.getTime();
        if (diff > 0) {
          totalMs += diff;
        }
        lastCheckIn = null;
      }
    }

    const hoursWorked = Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10;

    return {
      month,
      year,
      hoursWorked,
      lateCount,
      totalPunches: records.length,
      punches: records.map((r) => ({
        id: r.id,
        type: r.type.toLowerCase(),
        location: r.location,
        timestamp: r.timestamp,
      })),
    };
  }
}
