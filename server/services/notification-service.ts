import { DatabaseStorage } from '../storage';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export class NotificationService {
  constructor(private storage: DatabaseStorage) {}

  // إشعارات المسؤول فقط
  async notifyAdminGradeEntry(supervisorName: string, courseName: string, groupName: string) {
    const adminUsers = await this.storage.getUsersByRole('admin');
    
    for (const admin of adminUsers) {
      await this.storage.createNotification(
        admin.id,
        'تم إدخال درجات جديدة',
        `قام المشرف ${supervisorName} بإدخال درجات للمجموعة "${groupName}" في دورة "${courseName}"`,
        'info',
        supervisorName
      );
    }
  }

  async notifyAdminGradeUpdate(supervisorName: string, courseName: string, groupName: string) {
    const adminUsers = await this.storage.getUsersByRole('admin');
    
    for (const admin of adminUsers) {
      await this.storage.createNotification(
        admin.id,
        'تم تعديل درجات',
        `قام المشرف ${supervisorName} بتعديل درجات للمجموعة "${groupName}" في دورة "${courseName}"`,
        'warning',
        supervisorName
      );
    }
  }

  async notifyAdminCourseEndedNoGrades(courseName: string, groupName: string) {
    const adminUsers = await this.storage.getUsersByRole('admin');
    
    for (const admin of adminUsers) {
      await this.storage.createNotification(
        admin.id,
        'انتهت دورة بدون إدخال درجات',
        `انتهت المجموعة "${groupName}" في دورة "${courseName}" دون إدخال درجات حتى لطالب واحد`,
        'warning'
      );
    }
  }

  // إشعارات المشرف
  async notifySupervisorGroupEndedNoGrades(supervisorId: number, courseName: string, groupName: string, endDate: string) {
    const supervisor = await this.storage.getSupervisorWithUser(supervisorId);
    if (!supervisor) return;

    await this.storage.createNotification(
      supervisor.user.id,
      'انتهت فترة المجموعة - إدخال الدرجات مطلوب',
      `انتهت فترة المجموعة "${groupName}" في دورة "${courseName}" في تاريخ ${endDate}. يرجى إدخال الدرجات للطلاب`,
      'warning'
    );
  }

  async notifySupervisorNewAssignment(supervisorId: number, courseName: string, groupName: string) {
    const supervisor = await this.storage.getSupervisorWithUser(supervisorId);
    if (!supervisor) return;

    await this.storage.createNotification(
      supervisor.user.id,
      'تعيين جديد',
      `تم تعيينك كمشرف للمجموعة "${groupName}" في دورة "${courseName}"`,
      'info'
    );
  }

  // إشعارات الطالب
  async notifyStudentGradesAdded(studentId: number, courseName: string, groupName: string, finalGrade?: number) {
    const student = await this.storage.getStudentWithDetails(studentId);
    if (!student) return;

    const gradeText = finalGrade ? ` (الدرجة النهائية: ${finalGrade})` : '';
    
    await this.storage.createNotification(
      student.user.id,
      'تم إدراج درجاتك الجديدة',
      `تم إدراج درجاتك للمجموعة "${groupName}" في دورة "${courseName}"${gradeText}`,
      'success'
    );
  }

  // مراقبة الدورات المنتهية
  async checkEndedCoursesAndNotify() {
    try {
      // جلب المجموعات المنتهية في آخر 24 ساعة
      const endedGroups = await this.storage.getRecentlyEndedGroups();
      
      for (const group of endedGroups) {
        // فحص إذا كانت المجموعة فارغة (لا يوجد بها طلاب)
        const assignedStudents = await this.storage.getStudentsByGroupId(group.id);
        
        if (assignedStudents.length === 0) {
          // إشعار المسؤول أن الدورة انتهت بدون طلاب
          await this.notifyAdminCourseEndedNoGrades(
            group.course?.title || 'دورة غير محددة',
            group.groupName
          );
        } else {
          // فحص إذا لم يتم إدخال درجات للطلاب
          const studentsWithoutGrades = await this.storage.getStudentsWithoutGrades(group.id);
          
          if (studentsWithoutGrades.length > 0 && group.supervisorId) {
            // إشعار المشرف أن عليه إدخال الدرجات
            await this.notifySupervisorGroupEndedNoGrades(
              group.supervisorId,
              group.course?.title || 'دورة غير محددة',
              group.groupName,
              format(new Date(group.endDate), 'dd/MM/yyyy', { locale: ar })
            );
          }
        }
      }
    } catch (error) {
      console.error('Error checking ended courses:', error);
    }
  }
}

export const notificationService = new NotificationService(new DatabaseStorage());