import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const PopupApp: React.FC = () => {
  return (
    <div className="w-80 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Figma PR Extension</CardTitle>
          <CardDescription>
            Enhance GitHub PRs with Figma previews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => console.log('Extension clicked')}>
            Configure Extension
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default PopupApp