import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'

export default function PartnersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Partner Management</h1>
        <p className="text-muted-foreground">Manage labor supply partners</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partners</CardTitle>
          <CardDescription>Add and manage partners</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Features coming soon: Add partner, generate credentials, manage company details
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
