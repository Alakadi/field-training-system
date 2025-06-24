import { storage } from '../storage';

// نظام تحديث حالة الكورسات التلقائي
export class CourseStatusUpdater {
  private static instance: CourseStatusUpdater;
  private intervalId: NodeJS.Timeout | null = null;
  private lastUpdateDate: string | null = null;

  private constructor() {}

  static getInstance(): CourseStatusUpdater {
    if (!CourseStatusUpdater.instance) {
      CourseStatusUpdater.instance = new CourseStatusUpdater();
    }
    return CourseStatusUpdater.instance;
  }

  // بدء التحديث التلقائي كل 24 ساعة
  start(): void {
    // تحديث فوري عند بدء التشغيل
    this.updateCourseStatuses();

    // جدولة التحديث كل 24 ساعة (86400000 مللي ثانية)
    this.intervalId = setInterval(() => {
      this.updateCourseStatuses();
    }, 24 * 60 * 60 * 1000);

    console.log('Course status updater started - will run every 24 hours');
  }

  // إيقاف التحديث التلقائي
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Course status updater stopped');
    }
  }

  // تحديث حالة الكورسات إذا لم يتم التحديث اليوم
  async updateIfNeeded(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    if (this.lastUpdateDate !== today) {
      await this.updateCourseStatuses();
    }
  }

  // تنفيذ التحديث الفعلي
  private async updateCourseStatuses(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log(`Starting daily course status update for ${today}`);
      
      await storage.updateCourseStatusBasedOnDates();
      
      this.lastUpdateDate = today;
      console.log(`Course status update completed for ${today}`);
    } catch (error) {
      console.error('Error during course status update:', error);
    }
  }

  // للحصول على حالة آخر تحديث
  getLastUpdateDate(): string | null {
    return this.lastUpdateDate;
  }
}

// تصدير المثيل الوحيد
export const courseStatusUpdater = CourseStatusUpdater.getInstance();