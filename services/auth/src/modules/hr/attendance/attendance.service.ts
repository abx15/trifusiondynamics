import { Injectable, BadRequestException } from '@nestjs/common';
import { attendancePunchRepository } from '@agency-os/database';
import { PunchDto } from './dto/punch.dto';

@Injectable()
export class AttendanceService {
  async checkIn(
    employeeId: string,
    orgId: string,
    dto: PunchDto,
  ): Promise<any> {
    const today = new Date();
    const punches = await attendancePunchRepository.getPunchesForDate(
      employeeId,
      today,
    );

    // Rejects if last punch is 'check_in' (meaning they are currently checked in)
    if (punches.length > 0 && punches[punches.length - 1].type === 'check_in') {
      throw new BadRequestException(
        'You are already checked in. Please check out first.',
      );
    }

    return attendancePunchRepository.recordPunch({
      employeeId,
      organizationId: orgId,
      type: 'check_in',
      location: dto.location,
      timestamp: new Date(),
    });
  }

  async checkOut(
    employeeId: string,
    orgId: string,
    dto: PunchDto,
  ): Promise<any> {
    const today = new Date();
    const punches = await attendancePunchRepository.getPunchesForDate(
      employeeId,
      today,
    );

    // Rejects if no punches today or last punch is 'check_out' (no open check_in session)
    if (
      punches.length === 0 ||
      punches[punches.length - 1].type === 'check_out'
    ) {
      throw new BadRequestException(
        'No active check-in found. Please check in first.',
      );
    }

    return attendancePunchRepository.recordPunch({
      employeeId,
      organizationId: orgId,
      type: 'check_out',
      location: dto.location,
      timestamp: new Date(),
    });
  }

  async getTodayStatus(
    employeeId: string,
  ): Promise<{ isCheckedIn: boolean; punches: any[] }> {
    const today = new Date();
    const punches = await attendancePunchRepository.getPunchesForDate(
      employeeId,
      today,
    );
    const isCheckedIn =
      punches.length > 0 && punches[punches.length - 1].type === 'check_in';
    return {
      isCheckedIn,
      punches,
    };
  }

  async getMonthlySummary(
    employeeId: string,
    month: number,
    year: number,
  ): Promise<any> {
    // 1. Calculate date ranges
    const fromDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const toDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // 2. Fetch punches
    const punches =
      await attendancePunchRepository.getPunchesForEmployeeInRange(
        employeeId,
        fromDate,
        toDate,
      );

    // 3. Compute worked hours and late counts
    let totalMinutes = 0;
    let lateCount = 0;

    // Default shift start is 10:00 AM local time
    const LATE_HOUR = 10;

    let activeCheckIn: any = null;

    for (const punch of punches) {
      if (punch.type === 'check_in') {
        activeCheckIn = punch;

        // Late punch check (local hour is >= 10)
        const punchHour = new Date(punch.timestamp).getHours();
        if (punchHour >= LATE_HOUR) {
          lateCount++;
        }
      } else if (punch.type === 'check_out' && activeCheckIn) {
        const diffMs =
          new Date(punch.timestamp).getTime() -
          new Date(activeCheckIn.timestamp).getTime();
        totalMinutes += Math.max(0, diffMs / (1000 * 60));
        activeCheckIn = null;
      }
    }

    // If checked in but not checked out, do not count current active session yet
    const hoursWorked = totalMinutes / 60;

    return {
      month,
      year,
      hoursWorked: parseFloat(hoursWorked.toFixed(2)),
      lateCount,
      totalPunches: punches.length,
      punches,
    };
  }
}
