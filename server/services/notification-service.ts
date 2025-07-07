import { DatabaseStorage } from '../storage';

export class NotificationService {
  constructor(private storage: DatabaseStorage) {}

  // إشعارات المسؤول
  async notifyAdminGradeEntry(supervisorName: string, courseName: string, groupName: string) {
    const adminUsers = await this.storage.getUsersByRole('admin');
    
    for (const admin of adminUsers) {
      await this.storage.createNotification({
        userId: admin.id,
        title: 'تم إدخال درجات جديدة',
        message: `قام المشرف ${supervisorName} بإدخال درجات للمجموعة "${groupName}" في دورة "${courseName}"`,
        type: 'info'
      });
    }
  }

  async notifyAdminGradeUpdate(supervisorName: string, courseName: string, groupName: string) {
    const adminUsers = await this.storage.getUsersByRole('admin');
    
    for (const admin of adminUsers) {
      await this.storage.createNotification({
        userId: admin.id,
        title: 'تم تعديل درجات',
        message: `قام المشرف ${supervisorName} بتعديل درجات للمجموعة "${groupName}" في دورة "${courseName}"`,
        type: 'warning'
      });
    }
  }

  async notifyAdminCourseEndedNoStudents(courseName: string, groupName: string) {
    const adminUsers = await this.storage.getUsersByRole('admin');
    
    for (const admin of adminUsers) {
      await this.storage.createNotification({
        userId: admin.id,
        title: 'انتهت دورة بدون طلاب',
        message: `انتهت المجموعة "${groupName}" في دورة "${courseName}" دون تعيين أي طالب`,
        type: 'warning'
      });
    }
  }

  // إشعارات المشرف
  async notifySupervisorGroupEnded(supervisorId: number, courseName: string, groupName: string, endDate: string) {
    const supervisor = await this.storage.getSupervisorWithUser(supervisorId);
    if (!supervisor) return;

    await this.storage.createNotification({
      userId: supervisor.user.id,
      title: 'انتهت فترة المجموعة',
      message: `انتهت فترة المجموعة "${groupName}" في دورة "${courseName}" في تاريخ ${endDate}. يرجى إدخال الدرجات للطلاب`,
      type: 'warning'
    });
  }

  async notifySupervisorNewAssignment(supervisorId: number, courseName: string, groupName: string) {
    const supervisor = await this.storage.getSupervisorWithUser(supervisorId);
    if (!supervisor) return;

    await this.storage.createNotification({
      userId: supervisor.user.id,
      title: 'تعيين جديد',
      message: `تم تعيينك كمشرف للمجموعة "${groupName}" في دورة "${courseName}"`,
      type: 'success'
    });
  }

  // إشعارات الطالب
  async notifyStudentGradesAdded(studentId: number, courseName: string, groupName: string, grade?: number) {
    const student = await this.storage.getStudentWithDetails(studentId);
    if (!student) return;

    const gradeText = grade ? ` (الدرجة النهائية: ${grade})` : '';
    
    await this.storage.createNotification({
      userId: student.user.id,
      title: 'تم إدراج درجاتك',
      message: `تم إدراج درجاتك للمجموعة "${groupName}" في دورة "${courseName}"${gradeText}`,
      type: 'success'
    });
  }

  async notifyStudentAssignmentConfirmed(studentId: number, courseName: string, groupName: string) {
    const student = await this.storage.getStudentWithDetails(studentId);
    if (!student) return;

    await this.storage.createNotification({
      userId: student.user.id,
      title: 'تم تأكيد تسجيلك',
      message: `تم تأكيد تسجيلك في المجموعة "${groupName}" للدورة "${courseName}"`,
      type: 'success'
    });
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
          await this.notifyAdminCourseEndedNoStudents(
            group.course?.title || 'دورة غير محددة',
            group.groupName
          );
        } else {
          // فحص إذا لم يتم إدخال درجات للطلاب
          const studentsWithoutGrades = await this.storage.getStudentsWithoutGrades(group.id);
          
          if (studentsWithoutGrades.length > 0 && group.supervisorId) {
            // إشعار المشرف أن عليه إدخال الدرجات
            await this.notifySupervisorGroupEnded(
              group.supervisorId,
              group.course?.title || 'دورة غير محددة',
              group.groupName,
              new Date(group.endDate).toLocaleDateString('ar-SA')
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