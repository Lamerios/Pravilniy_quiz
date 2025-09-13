import React, { useState } from 'react';
import { Button, Card, Badge, Avatar, Modal } from 'ui';

const Showcase: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-grid">
      <Card header={<div>Кнопки</div>}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" onClick={() => setOpen(true)}>Открыть модалку</Button>
        </div>
      </Card>

      <Card header={<div>Бейджи и аватары</div>}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
          <Avatar name="Союз Греков" />
          <Avatar name="А" size={48} />
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Модальное окно">
        <p className="muted">Пример современного модального окна с blur backdrop.</p>
      </Modal>
    </div>
  );
};

export default Showcase;


