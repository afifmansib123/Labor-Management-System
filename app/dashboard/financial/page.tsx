import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'

export default function FinancialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financial Management</h1>
        <p className="text-muted-foreground">Track payments and financial transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Monthly payment tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Features coming soon: Payment calendar, batch pay, proof upload, approval workflow
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
