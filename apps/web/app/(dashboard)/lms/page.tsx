'use client';

import Link from 'next/link';
import { useCourses } from '@/lib/hooks/use-lms';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus, Users } from 'lucide-react';
import { CourseEnrollmentStatus } from '@/lib/types';

function statusLabel(s: string) {
  return s.replace('_', ' ');
}

export default function LMSPage() {
  const { data, isLoading, error } = useCourses({ limit: 10 });
  const courses = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LMS Courses</h1>
          <p className="text-sm text-muted-foreground">Manage learning courses and enrollments</p>
        </div>
        <Button asChild>
          <Link href="/lms/new">
            <Plus className="mr-2 h-4 w-4" /> New Course
          </Link>
        </Button>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search courses…" className="pl-8" />
      </div>

      {isLoading && <div className="text-muted-foreground py-8 text-center">Loading…</div>}
      {error && <div className="text-destructive">Failed to load courses.</div>}

      {!isLoading && courses.length === 0 && (
        <div className="text-center text-muted-foreground py-8">No courses found</div>
      )}

      {!isLoading && courses.length > 0 && (
        <Card>
          <div className="grid grid-cols-3 gap-4 p-4 text-sm font-medium text-muted-foreground border-b">
            <span>Title</span>
            <span>Category</span>
            <span>Enrolled</span>
          </div>
          {courses.map((course: any) => (
            <Link key={course.id} href={`/lms/${course.id}`} className="grid grid-cols-3 gap-4 p-4 text-sm hover:bg-muted/50 transition-colors border-b last:border-b-0">
              <span className="font-medium">{course.title}</span>
              <span className="text-muted-foreground">{course.category ?? '—'}</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {course._count?.courseTrainees ?? 0}</span>
            </Link>
          ))}
        </Card>
      )}

      {total > 10 && (
        <div className="text-sm text-muted-foreground text-center">{total} total courses</div>
      )}
    </div>
  );
}