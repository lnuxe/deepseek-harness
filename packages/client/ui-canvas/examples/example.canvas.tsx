import { useState } from 'cursor/canvas'
import { Button, Card, CardBody, CardHeader, Stack, Stat, Text } from 'cursor/canvas'

export default function ExampleCanvas() {
  const [count, setCount] = useState(0)
  return (
    <Stack gap={12}>
      <Card>
        <CardHeader>DSH Canvas — Example</CardHeader>
        <CardBody>
          <Text>This canvas compiles from a single .canvas.tsx file.</Text>
          <Stat value={count} label="clicks" tone="info" />
          <Button variant="primary" onClick={() => setCount(count + 1)}>
            Increment
          </Button>
        </CardBody>
      </Card>
    </Stack>
  )
}
