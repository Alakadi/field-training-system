import { Request, Response } from 'express';
import { storage } from '../storage';
import { courseStatusUpdater } from '../schedulers/course-status-updater';

// API endpoint لمعلومات حالة التحديث
export async function getCourseStatusInfo(req: Request, res: Response) {
  try {
    const lastUpdate = courseStatusUpdater.getLastUpdateDate();
    const today = new Date().toISOString().split('T')[0];
    
    res.json({
      lastUpdateDate: lastUpdate,
      todaysDate: today,
      isUpToDate: lastUpdate === today,
      updateFrequency: "24 hours",
      nextUpdateTime: lastUpdate ? 
        new Date(new Date(lastUpdate).getTime() + 24 * 60 * 60 * 1000).toISOString() :
        "Soon"
    });
  } catch (error) {
    console.error('Error getting course status info:', error);
    res.status(500).json({ message: "خطأ في الحصول على معلومات الحالة" });
  }
}

// API endpoint لتحديث فوري (للمسؤولين فقط)
export async function forceUpdateCourseStatus(req: Request, res: Response) {
  try {
    console.log('Manual course status update requested by:', req.user?.username);
    
    await storage.updateCourseStatusBasedOnDates();
    
    res.json({
      message: "تم تحديث حالة الكورسات بنجاح",
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during manual course status update:', error);
    res.status(500).json({ message: "خطأ في تحديث حالة الكورسات" });
  }
}