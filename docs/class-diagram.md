
# مخطط الكلاسات - نظام إدارة التدريب الجامعي

## Class Diagram in Mermaid

```mermaid
classDiagram
    %% الكلاسات الأساسية
    class User {
        +int id
        +string username
        +string password
        +string role
        +string name
        +string email
        +string phone
        +boolean active
        +timestamp createdAt
        +login()
        +logout()
        +updateProfile()
    }

    class Faculty {
        +int id
        +string name
        +getMajors()
        +addMajor()
    }

    class Major {
        +int id
        +string name
        +int facultyId
        +getStudents()
        +getCourses()
    }

    class Level {
        +int id
        +string name
        +getStudents()
    }

    class AcademicYear {
        +int id
        +string name
        +date startDate
        +date endDate
        +boolean isCurrent
        +timestamp createdAt
        +activate()
        +deactivate()
    }

    %% كلاسات المستخدمين المتخصصة
    class Admin {
        +manageUsers()
        +manageCourses()
        +manageTrainingSites()
        +generateReports()
        +viewActivityLogs()
        +manageAcademicYears()
    }

    class Supervisor {
        +int id
        +int userId
        +int facultyId
        +string department
        +evaluateStudents()
        +manageGroups()
        +submitGrades()
        +viewAssignedStudents()
    }

    class Student {
        +int id
        +int userId
        +string universityId
        +int facultyId
        +int majorId
        +int levelId
        +registerForCourse()
        +viewGrades()
        +viewCourses()
        +confirmAssignment()
    }

    %% كلاسات التدريب
    class TrainingSite {
        +int id
        +string name
        +string address
        +string contactName
        +string contactEmail
        +string contactPhone
        +getGroups()
        +addGroup()
    }

    class TrainingCourse {
        +int id
        +string name
        +int facultyId
        +int majorId
        +int levelId
        +int academicYearId
        +string description
        +string status
        +timestamp createdAt
        +int createdBy
        +createGroups()
        +updateStatus()
        +getEnrollmentStats()
    }

    class TrainingCourseGroup {
        +int id
        +int courseId
        +string groupName
        +int siteId
        +int supervisorId
        +date startDate
        +date endDate
        +int capacity
        +int currentEnrollment
        +string location
        +string status
        +timestamp createdAt
        +addStudent()
        +removeStudent()
        +updateCapacity()
        +isFull()
    }

    class TrainingAssignment {
        +int id
        +int studentId
        +int courseId
        +int groupId
        +int assignedBy
        +string status
        +boolean confirmed
        +timestamp assignedAt
        +numeric attendanceGrade
        +numeric behaviorGrade
        +numeric finalExamGrade
        +numeric calculatedFinalGrade
        +calculateFinalGrade()
        +confirm()
        +updateGrades()
    }

    class Evaluation {
        +int id
        +int assignmentId
        +int score
        +string comments
        +string evaluatorName
        +timestamp evaluationDate
        +int createdBy
        +submitEvaluation()
        +updateEvaluation()
    }

    %% كلاسات النظام
    class Notification {
        +int id
        +int userId
        +string title
        +string message
        +string type
        +boolean isRead
        +timestamp createdAt
        +markAsRead()
        +send()
    }

    class ActivityLog {
        +int id
        +string username
        +string action
        +string entityType
        +int entityId
        +json details
        +timestamp timestamp
        +log()
        +getByUser()
        +getByEntity()
    }

    %% العلاقات الأساسية
    User ||--o{ Admin : extends
    User ||--o{ Supervisor : extends
    User ||--o{ Student : extends

    Faculty ||--o{ Major : contains
    Faculty ||--o{ Student : belongs to
    Faculty ||--o{ Supervisor : works in
    Faculty ||--o{ TrainingCourse : offered by

    Major ||--o{ Student : studies
    Major ||--o{ TrainingCourse : for

    Level ||--o{ Student : at
    Level ||--o{ TrainingCourse : for

    AcademicYear ||--o{ TrainingCourse : during

    %% علاقات التدريب
    TrainingCourse ||--o{ TrainingCourseGroup : divided into
    TrainingCourseGroup ||--o{ TrainingAssignment : contains
    TrainingSite ||--o{ TrainingCourseGroup : hosts

    Student ||--o{ TrainingAssignment : enrolled in
    Supervisor ||--o{ TrainingCourseGroup : supervises
    TrainingAssignment ||--o{ Evaluation : evaluated by

    User ||--o{ Notification : receives
    User ||--o{ ActivityLog : performs

    %% علاقات إضافية
    User ||--o{ TrainingCourse : creates
    User ||--o{ Evaluation : creates
```

## الوصف التفصيلي للكلاسات

### 1. الكلاسات الأساسية
- **User**: الكلاس الأساسي لجميع المستخدمين
- **Faculty**: إدارة الكليات
- **Major**: إدارة التخصصات
- **Level**: إدارة المستويات الدراسية
- **AcademicYear**: إدارة السنوات الدراسية

### 2. كلاسات المستخدمين المتخصصة
- **Admin**: المسؤول - يدير النظام بالكامل
- **Supervisor**: المشرف - يشرف على مجموعات التدريب
- **Student**: الطالب - يسجل في الدورات ويتلقى التقييمات

### 3. كلاسات التدريب
- **TrainingSite**: جهات التدريب
- **TrainingCourse**: الدورات التدريبية
- **TrainingCourseGroup**: مجموعات التدريب
- **TrainingAssignment**: تسجيل الطلاب في الدورات
- **Evaluation**: تقييمات الطلاب

### 4. كلاسات النظام
- **Notification**: نظام الإشعارات
- **ActivityLog**: سجل النشاطات

## الميزات الرئيسية للمخطط

1. **الوراثة**: User كلاس أساسي يورث للأدوار المختلفة
2. **التجميع**: Faculty يحتوي على Major متعددة
3. **الارتباط**: علاقات متعددة بين الكيانات
4. **التخصص**: كل دور له وظائف محددة
5. **المرونة**: دعم تعدد المجموعات والتقييمات
