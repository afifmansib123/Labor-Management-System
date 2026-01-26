import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'

export default function WorkforcePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workforce Management</h1>
        <p className="text-muted-foreground">Manage employees and staff</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workforce Management</CardTitle>
          <CardDescription>This page is under development</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Features coming soon: Employee list, batch add, filters, approval workflow
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
